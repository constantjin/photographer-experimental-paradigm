import { writeFile, access } from "fs/promises";
import { resolve } from "path";
import * as ort from "onnxruntime-node";

import Tokenizer from "../shared/clip_bpe";
import Vips from "wasm-vips";

let clipTextTokenizer: Tokenizer | undefined = undefined;
let clipTextModel: ort.InferenceSession | undefined = undefined;
let vips: typeof Vips | undefined = undefined;
let clipImageModel: ort.InferenceSession | undefined = undefined;

export async function loadCLIPTextModel(
  _event: Electron.IpcMainInvokeEvent,
  clipTextModelPath: string,
): Promise<APIResponse> {
  try {
    if (!clipTextTokenizer) {
      clipTextTokenizer = new Tokenizer();
    }

    if (!clipTextModel) {
      const resolvedModelPath = resolve(clipTextModelPath);
      await access(resolvedModelPath);
      clipTextModel = await ort.InferenceSession.create(resolvedModelPath);
    }

    return {
      status: "success",
      message: "Successfully loaded",
      detailed: [
        "[api:loadCLIPTextModel] Successfully loaded the BPE Tokenizer and CLIP-Text model.",
      ],
    };
  } catch (e) {
    return {
      status: "error",
      message: "Failed to load",
      detailed: [
        "[api:loadCLIPTextModel] Falied to load the CLIP-Text encoder:",
        `${e}`,
      ],
    };
  }
}

export async function loadCLIPImageModel(
  _event: Electron.IpcMainInvokeEvent,
  clipImageModelPath: string,
): Promise<APIResponse> {
  try {
    if (!vips) {
      vips = await Vips();
    }

    if (!clipImageModel) {
      const resolvedModelPath = resolve(clipImageModelPath);
      await access(resolvedModelPath);
      clipImageModel = await ort.InferenceSession.create(resolvedModelPath);
    }

    return {
      status: "success",
      message: "Successfully loaded",
      detailed: [
        "[api:loadCLIPImageModel] Successfully loaded the wasm-vips and CLIP-Image model.",
      ],
    };
  } catch (e) {
    return {
      status: "error",
      message: "Failed to load",
      detailed: [
        "[api:loadCLIPImageModel] Falied to load the CLIP-Image encoder:",
        `${e}`,
      ],
    };
  }
}

export async function predictCLIPTextFeature(
  _event: Electron.IpcMainInvokeEvent,
  inputText: string,
  runFeatureVectorDirPath: string,
  fileName: string,
): Promise<APIResponse> {
  if (!clipTextModel || !clipTextTokenizer) {
    return {
      status: "error",
      message: "Unloaded CLIP-Text model",
      detailed: [
        "[api:predictCLIPTextFeature] CLIP-Text model was not loaded.",
      ],
    };
  }

  if (inputText === "") {
    return {
      status: "error",
      message: "CLIP-Text input is empty",
      detailed: ["[api:predictCLIPTextFeature] Input is an empty string."],
    };
  }

  try {
    const textTokens = clipTextTokenizer.encodeForCLIP(inputText);
    const textTokensArray = Int32Array.from(textTokens);
    const feeds = {
      input: new ort.Tensor("int32", textTokensArray, [1, 77]),
    };
    const results = await clipTextModel.run(feeds);
    const textFeature = results?.output?.data as Float32Array;

    // Write the textFeature to a file
    const resolvedFilePath = resolve(
      runFeatureVectorDirPath,
      `${fileName}.json`,
    );
    await writeFile(resolvedFilePath, JSON.stringify(Array.from(textFeature)));

    return {
      status: "success",
      message: "Successful prediction",
      detailed: [
        "[api:predictCLIPTextFeature] Successfully predicted the CLIP text feature.",
      ],
      data: textFeature,
    };
  } catch (e) {
    return {
      status: "error",
      message: "Prediction failed",
      detailed: [
        "[api:predictCLIPTextFeature] Failed to predict the CLIP text feature or save the feature vector:",
        `${e}`,
      ],
    };
  }
}

export async function resizeImageForCLIP(
  _event: Electron.IpcMainInvokeEvent,
  base64ImageURL: string,
): Promise<APIResponse> {
  if (!vips) {
    return {
      status: "error",
      message: "Unloaded Wasm-Vips",
      detailed: ["[api:reizeForCLIPImageModel] Wasm-Vips was not loaded."],
    };
  }

  if (base64ImageURL === "") {
    return {
      status: "error",
      message: "CLIP-Image input is empty",
      detailed: ["[api:reizeForCLIPImageModel] Input is an empty string."],
    };
  }

  // Reference: https://gist.github.com/josephrocca/d97e0532f34e1205f4006d45ca909024
  const size = 224;
  const resizeType = "cubic";

  const inputToArrayBuffer = await (await fetch(base64ImageURL)).arrayBuffer();

  // resize types available: cubic, linear, lanczos2, lanczos3, nearest, mitchell
  const im1 = vips.Image.newFromBuffer(inputToArrayBuffer);

  // Resize so smallest side is `size` px:
  const scale = 224 / Math.min(im1.height, im1.width);
  const im2 = im1.resize(scale, { kernel: vips.Kernel[resizeType] });

  // crop to `size` x `size`:
  const left = (im2.width - size) / 2;
  const top = (im2.height - size) / 2;
  const im3 = im2.crop(left, top, size, size);

  const outBuffer = new Uint8Array(im3.writeToBuffer(".png"));
  im1.delete(), im2.delete(), im3.delete();
  // let resizedBlob = new Blob([outBuffer], { type: "image/png" });
  // const base64Blob = await blobToBase64(resizedBlob);

  return {
    status: "success",
    message: "Image successfully resized",
    detailed: [
      "[api:reizeForCLIPImageModel] Successfully resized the base64-encoded image.",
    ],
    data: outBuffer,
  };
}

export async function predictCLIPImageFeature(
  _event: Electron.IpcMainInvokeEvent,
  inputImageArray: Float32Array,
  runFeatureVectorDirPath: string,
  fileName: string,
): Promise<APIResponse> {
  if (!clipImageModel) {
    return {
      status: "error",
      message: "Unloaded CLIP-Image model",
      detailed: [
        "[api:predictCLIPImageFeature] CLIP-Image model was not loaded.",
      ],
    };
  }

  if (!inputImageArray) {
    return {
      status: "error",
      message: "CLIP-Image input is undefined",
      detailed: ["[api:predictCLIPImageFeature] Input is undefined."],
    };
  }

  try {
    const feeds = {
      input: new ort.Tensor("float32", inputImageArray, [1, 3, 224, 224]),
    };
    const results = await clipImageModel.run(feeds);
    const imageFeature = results?.output?.data as Float32Array;

    // Write the imageFeature to a file
    const resolvedFilePath = resolve(
      runFeatureVectorDirPath,
      `${fileName}.json`,
    );
    await writeFile(resolvedFilePath, JSON.stringify(Array.from(imageFeature)));

    return {
      status: "success",
      message: "Successful prediction",
      detailed: [
        "[api:predictCLIPImageFeature] Successfully predicted the CLIP image feature.",
      ],
      data: imageFeature,
    };
  } catch (e) {
    return {
      status: "error",
      message: "Prediction failed",
      detailed: [
        "[api:predictCLIPImageFeature] Failed to predict the CLIP image feature or save the feature vector:",
        `${e}`,
      ],
    };
  }
}
