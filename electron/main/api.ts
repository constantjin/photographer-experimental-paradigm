import { dialog } from "electron";
import {
  readFile,
  writeFile,
  appendFile,
  access,
  mkdir,
  readdir,
} from "fs/promises";
import { resolve } from "path";
import * as ort from "onnxruntime-node";
import { z } from "zod";
import dayjs from "dayjs";

import Tokenizer from "../shared/clip_bpe";
import Vips from "wasm-vips";
import fetch from "node-fetch";

let clipTextTokenizer: Tokenizer | undefined = undefined;
let clipTextModel: ort.InferenceSession | undefined = undefined;
let vips: typeof Vips | undefined = undefined;
let clipImageModel: ort.InferenceSession | undefined = undefined;

const ExperimentalSetting = z
  .object({
    googleMapsAPIKey: z.string(),
    clipTextModelPath: z.string(),
    clipImageModelPath: z.string(),
    experimentalDataStorePath: z.string(),
    azureAPIUrl: z.string(),
    azureAPIKey: z.string(),
    googleTTSAPIKey: z.string(),
    runInfo: z.array(
      z
        .object({
          city: z.string(),
          latlng: z.object({
            lat: z.number(),
            lng: z.number(),
          }),
          captionTarget: z.string(),
        })
        .strict()
    ),
    trialInfo: z
      .object({
        captureIntervalInMs: z.number(),
        totalNumberOfTrials: z.number(),
        fixationDurationInMs: z.number(),
        fixationJitterRatio: z.number(),
        capturePreviewDurationInMs: z.number(),
        multimodalDurationInMs: z.number(),
        speakingRate: z.number(),
        propabilityOfCaptionText: z.number(),
        rewardDurationInMs: z.number(),
        minSimilarityThreshold: z.number(),
        maxSimilarityThreshold: z.number(),
      })
      .strict(),
  })
  .strict();

interface IRunInfo {
  city: string;
}

export async function registerParticipant(
  _,
  experimentalDataPath: string,
  participantName: string,
  participantID: string,
  runInfo: IRunInfo[]
): Promise<APIResponse> {
  let resolvedDataPath = undefined;

  if (!participantName || participantName === "") {
    return {
      status: "error",
      message: "Participant name is empty or undefined",
      detailed: [
        "[api:registerParticipant] participantName is undefined or empty",
      ],
    };
  }

  if (!participantID || participantID === "") {
    return {
      status: "error",
      message: "Participant ID is empty or undefined",
      detailed: [
        "[api:registerParticipant] participantID is undefined or empty",
      ],
    };
  }

  try {
    resolvedDataPath = resolve(
      experimentalDataPath,
      `${participantID}_${participantName}`
    );
  } catch (e) {
    return {
      status: "error",
      message: "Undefined or malformed data path",
      detailed: [
        "[api:registerParticipant] experimentalDataPath is undefined or malformed:",
        `${e}`,
      ],
    };
  }

  try {
    await access(resolvedDataPath);

    try {
      const runInfoFilePath = resolve(resolvedDataPath, "runinfo.txt");
      const allRunsArray = (await readFile(runInfoFilePath, "utf-8")).split(
        "\n"
      );
      const allRunsDirNameArray = allRunsArray.map((run) => run.split("#")[0]);
      const completedRunsArray = (
        await readdir(resolvedDataPath, { withFileTypes: true })
      )
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      const remainingRunsArray = allRunsDirNameArray.filter(
        (run) => !completedRunsArray.includes(run)
      );

      if (remainingRunsArray.length === 0) {
        return {
          status: "error",
          message: "Participant finished all runs",
          detailed: [
            "[api:registerParticipant] This participant completed all runs.",
          ],
        };
      }

      const currentRunDirName = remainingRunsArray[0];
      const currentRunDirNameIndex =
        allRunsDirNameArray.indexOf(currentRunDirName);
      const currentRunOriginalIndex = Number(
        allRunsArray[currentRunDirNameIndex].split("#")[1]
      );

      // Create the run root directory
      const participantRunDataDirPath = resolve(
        resolvedDataPath,
        remainingRunsArray[0]
      );
      await mkdir(participantRunDataDirPath, { recursive: true });

      // Create sub directories
      const runCaptureDirPath = resolve(participantRunDataDirPath, "capture");
      await mkdir(runCaptureDirPath, { recursive: true });

      const runFeatureVectorDirPath = resolve(
        participantRunDataDirPath,
        "feature_vector"
      );
      await mkdir(runFeatureVectorDirPath, { recursive: true });

      const runCaptionAudioDirPath = resolve(
        participantRunDataDirPath,
        "caption_audio"
      );
      await mkdir(runCaptionAudioDirPath, { recursive: true });

      // Select RunInfo for this run
      const thisRunInfo = runInfo[currentRunOriginalIndex];

      return {
        status: "success",
        message: `Participant loaded (${participantID}_${participantName}, Run ${
          currentRunDirNameIndex + 1
        })`,
        data: {
          dataDirPaths: {
            participantRunDataDirPath,
            runCaptureDirPath,
            runFeatureVectorDirPath,
            runCaptionAudioDirPath,
          },
          currentRunInfo: thisRunInfo,
        },
        detailed: [
          `[api:registerParticipant] Participant (${participantID}_${participantName}) successfully loaded.`,
        ],
      };
    } catch (e) {
      return {
        status: "error",
        message: "Cannot load the participant's data directory",
        detailed: [
          "[api:registerParticipant] cannot load the runinfo.txt or mkdir on participantRunDataDirPath failed:",
          `${e}`,
        ],
      };
    }
  } catch {
    try {
      await mkdir(resolvedDataPath, { recursive: true });
      // Shuffle the runInfo array
      const shuffledRunInfo = runInfo
        .map((value, original_index) => ({
          value,
          sort: Math.random(),
          original_index,
        }))
        .sort((a, b) => a.sort - b.sort)
        .map(
          (runValue, index) =>
            `${index + 1}_${runValue.value.city.replace(/\s+/g, "_")}#${
              runValue.original_index
            }`
        );

      const runInfoFilePath = resolve(resolvedDataPath, "runinfo.txt");
      await writeFile(runInfoFilePath, shuffledRunInfo.join("\n"), "utf-8");

      // Create the run root directory
      const participantRunDataDirPath = resolve(
        resolvedDataPath,
        shuffledRunInfo[0].split("#")[0]
      );
      await mkdir(participantRunDataDirPath, { recursive: true });

      // Create sub directories
      const runCaptureDirPath = resolve(participantRunDataDirPath, "capture");
      await mkdir(runCaptureDirPath, { recursive: true });

      const runFeatureVectorDirPath = resolve(
        participantRunDataDirPath,
        "feature_vector"
      );
      await mkdir(runFeatureVectorDirPath, { recursive: true });

      const runCaptionAudioDirPath = resolve(
        participantRunDataDirPath,
        "caption_audio"
      );
      await mkdir(runCaptionAudioDirPath, { recursive: true });

      // Select RunInfo for this run
      const currentRunOriginalIndex = Number(shuffledRunInfo[0].split("#")[1]);
      const thisRunInfo = runInfo[currentRunOriginalIndex];

      return {
        status: "success",
        message: `Participant registered (${participantID}_${participantName}, Run 1)`,
        data: {
          dataDirPaths: {
            participantRunDataDirPath,
            runCaptureDirPath,
            runFeatureVectorDirPath,
            runCaptionAudioDirPath,
          },
          currentRunInfo: thisRunInfo,
        },
        detailed: [
          `[api:registerParticipant] Participant (${participantID}_${participantName}) successfully registered.`,
        ],
      };
    } catch (e) {
      return {
        status: "error",
        message: "Cannot create participant's data directories",
        detailed: [
          "[api:registerParticipant] mkdir on resolvedDataPath failed:",
          `${e}`,
        ],
      };
    }
  }
}

export async function handleLoadSetting(_): Promise<APIResponse> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select the setting file (json).",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled) {
    return {
      status: "error",
      message: "Unloaded",
    };
  } else {
    try {
      const data = ExperimentalSetting.parse(
        JSON.parse(await readFile(filePaths[0], "utf-8"))
      );
      return {
        status: "success",
        message: "Successfully loaded",
        data,
        detailed: [
          "[api:handleLoadSetting] Setting file (JSON) was successfully loaded.",
        ],
      };
    } catch (e) {
      return {
        status: "error",
        message: "JSON parse error",
        detailed: ["[api:handleLoadSetting] JSON parse error:", `${e}`],
      };
    }
  }
}

export async function writeEtimeFile(
  _,
  participantRunDataDirPath: string,
  message: string
): Promise<APIResponse> {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss.SSS");
  try {
    const resolvedFilePath = resolve(
      participantRunDataDirPath,
      "log_etime.txt"
    );
    await appendFile(resolvedFilePath, `${now}\t${message}\n`, "utf-8");
    return {
      status: "success",
      message: "Successfully wrote the etime file",
      detailed: [
        `[api:writeEtimeFile] Etime successfully logged @ ${now} (msg: ${message}).`,
      ],
    };
  } catch (e) {
    return {
      status: "error",
      message: "Failed to write the etime file",
      detailed: ["[api:writeEtimeFile] Failed to log the etime:", `${e}`],
    };
  }
}

export async function writeControllerActionFile(
  _,
  participantRunDataDirPath: string,
  message: string
): Promise<APIResponse> {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss.SSS");
  try {
    const resolvedFilePath = resolve(
      participantRunDataDirPath,
      "controller_action.txt"
    );
    await appendFile(resolvedFilePath, `${now}\t${message}\n`, "utf-8");
    return {
      status: "success",
      message: "Successfully wrote the controller action file",
      detailed: [
        `[api:writeControllerActionFile] Action successfully logged @ ${now} (msg: ${message}).`,
      ],
    };
  } catch (e) {
    return {
      status: "error",
      message: "Failed to write the controller action file",
      detailed: [
        "[api:writeControllerActionFile] Failed to log the action file:",
        `${e}`,
      ],
    };
  }
}

export async function loadCLIPTextModel(
  _,
  clipTextModelPath: string
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
  _,
  clipImageModelPath: string
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
  _,
  input: string,
  runFeatureVectorDirPath: string,
  fileName: string
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

  if (input === "") {
    return {
      status: "error",
      message: "CLIP-Text input is empty",
      detailed: ["[api:predictCLIPTextFeature] Input is an empty string."],
    };
  }

  try {
    const textTokens = clipTextTokenizer.encodeForCLIP(input);
    const textTokensArray = Int32Array.from(textTokens);
    const feeds = {
      input: new ort.Tensor("int32", textTokensArray, [1, 77]),
    };
    const results = await clipTextModel.run(feeds);
    const textFeature = results?.output?.data as Float32Array;

    // Write the textFeatur to a file
    const resolvedFilePath = resolve(
      runFeatureVectorDirPath,
      `${fileName}.json`
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

export async function storeCapturedImage(
  _,
  base64Url: string,
  participantDataDirPath: string,
  imageName: string
): Promise<APIResponse> {
  try {
    const resolvedFilePath = resolve(
      participantDataDirPath,
      `${imageName}.png`
    );
    await writeFile(resolvedFilePath, base64Url, "base64");
    return {
      status: "success",
      message: "Successfully stored the capture",
      detailed: [
        `[api:storeCapturedImage] Successfully stored the captured image: ${imageName}.png.`,
      ],
    };
  } catch (e) {
    return {
      status: "error",
      message: "Failed to store the capture",
      detailed: [
        `[api:storeCapturedImage] Cannot store the captured image: ${imageName}.png:`,
        `${e}`,
      ],
    };
  }
}

export async function storeCaptionSound(
  _,
  base64Url: string,
  captionSoundDataDirPath: string,
  soundName: string
): Promise<APIResponse> {
  try {
    const resolvedFilePath = resolve(
      captionSoundDataDirPath,
      `${soundName}.mp3`
    );
    await writeFile(resolvedFilePath, base64Url, "base64");
    return {
      status: "success",
      message: "Successfully stored the voice",
      detailed: [
        `[api:storeCaptionSound] Successfully stored the TTS caption voice: ${soundName}.mp3.`,
      ],
    };
  } catch (e) {
    return {
      status: "error",
      message: "Failed to store the voice",
      detailed: [
        `[api:storeCapturedImage] Cannot store the TTS caption voice: ${soundName}.mp3:`,
        `${e}`,
      ],
    };
  }
}

export async function resizeImageForCLIP(
  _,
  input: string
): Promise<APIResponse> {
  if (!vips) {
    return {
      status: "error",
      message: "Unloaded Wasm-Vips",
      detailed: ["[api:reizeForCLIPImageModel] Wasm-Vips was not loaded."],
    };
  }

  if (input === "") {
    return {
      status: "error",
      message: "CLIP-Image input is empty",
      detailed: ["[api:reizeForCLIPImageModel] Input is an empty string."],
    };
  }

  // Reference: https://gist.github.com/josephrocca/d97e0532f34e1205f4006d45ca909024
  const size = 224;
  const resizeType = "cubic";

  const inputToArrayBuffer = await (await fetch(input)).arrayBuffer();

  // resize types available: cubic, linear, lanczos2, lanczos3, nearest, mitchell
  let im1 = vips.Image.newFromBuffer(inputToArrayBuffer);

  // Resize so smallest side is `size` px:
  const scale = 224 / Math.min(im1.height, im1.width);
  let im2 = im1.resize(scale, { kernel: vips.Kernel[resizeType] });

  // crop to `size` x `size`:
  let left = (im2.width - size) / 2;
  let top = (im2.height - size) / 2;
  let im3 = im2.crop(left, top, size, size);

  let outBuffer = new Uint8Array(im3.writeToBuffer(".png"));
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
  _,
  input: Float32Array,
  runFeatureVectorDirPath: string,
  fileName: string
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

  if (!input) {
    return {
      status: "error",
      message: "CLIP-Image input is undefined",
      detailed: ["[api:predictCLIPImageFeature] Input is undefined."],
    };
  }

  try {
    const feeds = {
      input: new ort.Tensor("float32", input, [1, 3, 224, 224]),
    };
    const results = await clipImageModel.run(feeds);
    const imageFeature = results?.output?.data as Float32Array;

    // Write the textFeature to a file
    const resolvedFilePath = resolve(
      runFeatureVectorDirPath,
      `${fileName}.json`
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
