import { writeFile, appendFile } from "fs/promises";
import { resolve } from "path";

import dayjs from "dayjs";

export async function storeCapturedImage(
  _event: Electron.IpcMainInvokeEvent,
  base64ImageURL: string,
  participantDataDirPath: string,
  imageName: string,
): Promise<APIResponse> {
  try {
    const resolvedFilePath = resolve(
      participantDataDirPath,
      `${imageName}.png`,
    );
    await writeFile(resolvedFilePath, base64ImageURL, "base64");
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
  _event: Electron.IpcMainInvokeEvent,
  base64SoundURL: string,
  captionSoundDataDirPath: string,
  soundName: string,
): Promise<APIResponse> {
  try {
    const resolvedFilePath = resolve(
      captionSoundDataDirPath,
      `${soundName}.mp3`,
    );
    await writeFile(resolvedFilePath, base64SoundURL, "base64");
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

export async function writeControllerActionFile(
  _event: Electron.IpcMainInvokeEvent,
  participantRunDataDirPath: string,
  message: string,
): Promise<APIResponse> {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss.SSS");
  try {
    const resolvedFilePath = resolve(
      participantRunDataDirPath,
      "controller_action.txt",
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
