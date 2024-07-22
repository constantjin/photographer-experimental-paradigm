import { appendFile } from "fs/promises";
import { resolve } from "path";

import dayjs from "dayjs";

export { handleLoadSetting, registerParticipant } from "./start";
export {
  loadCLIPTextModel,
  loadCLIPImageModel,
  predictCLIPTextFeature,
  resizeImageForCLIP,
  predictCLIPImageFeature,
} from "./clip";
export {
  storeCapturedImage,
  storeCaptionSound,
  writeControllerActionFile,
} from "./street";

export async function writeEtimeFile(
  _event: Electron.IpcMainInvokeEvent,
  participantRunDataDirPath: string,
  message: string,
): Promise<APIResponse> {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss.SSS");
  try {
    const resolvedFilePath = resolve(
      participantRunDataDirPath,
      "log_etime.txt",
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
