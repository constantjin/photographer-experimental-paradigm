import { dialog } from "electron";
import { readFile, writeFile, access, mkdir, readdir } from "fs/promises";
import { resolve } from "path";
import type { z } from "zod";

import type { RunInfoSchema } from "../shared/constants";
import { ExperimentalSettingSchema } from "../shared/constants";

type RunInfo = z.infer<typeof RunInfoSchema>;

export async function handleLoadSetting(
  _event: Electron.IpcMainInvokeEvent,
): Promise<APIResponse> {
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
      const data = ExperimentalSettingSchema.parse(
        JSON.parse(await readFile(filePaths[0], "utf-8")),
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

export async function registerParticipant(
  _event: Electron.IpcMainInvokeEvent,
  experimentalDataPath: string,
  participantName: string,
  participantID: string,
  runInfo: RunInfo[],
): Promise<APIResponse> {
  let resolvedDataPath = undefined;

  // Validate name and participantID
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

  // Check access of participant's data path
  try {
    resolvedDataPath = resolve(
      experimentalDataPath,
      `${participantID}_${participantName}`,
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

  let isFirstRun = false;
  try {
    await access(resolvedDataPath);
  } catch (e) {
    isFirstRun = true;
  }

  // If this is the first run (i.e., first registration),
  // create the participant's data directory and runinfo.txt
  if (isFirstRun) {
    try {
      await mkdir(resolvedDataPath, { recursive: true });
    } catch (e) {
      return {
        status: "error",
        message: "Cannot create participant's data directory",
        detailed: [
          "[api:registerParticipant] mkdir on resolvedDataPath failed:",
          `${e}`,
        ],
      };
    }

    try {
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
            }`,
        );
      const runInfoFilePath = resolve(resolvedDataPath, "runinfo.txt");
      await writeFile(runInfoFilePath, shuffledRunInfo.join("\n"), "utf-8");
    } catch (e) {
      return {
        status: "error",
        message: "Cannot create run information file",
        detailed: [
          "[api:registerParticipant] cannot create runinfo.txt",
          `${e}`,
        ],
      };
    }
  }

  // Read runinfo.txt, create run data directories, extract run information,
  // and finally register the participant
  try {
    // Format of `runinfo.txt`: [run number]_[city_name]#[index for runInfo array]
    // Note that [run number]_[city name] represents a name for the run data dir

    const runInfoFilePath = resolve(resolvedDataPath, "runinfo.txt");
    const allRunsArray = (await readFile(runInfoFilePath, "utf-8")).split("\n");

    const allRunsDirNameArray = allRunsArray.map((run) => run.split("#")[0]);

    // Created run data dirs represent completed runs
    const completedRunsArray = (
      await readdir(resolvedDataPath, { withFileTypes: true })
    )
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
    const remainingRunsArray = allRunsDirNameArray.filter(
      (run) => !completedRunsArray.includes(run),
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
    // currentRunDirNameIndex is related to the current run number
    const currentRunDirNameIndex =
      allRunsDirNameArray.indexOf(currentRunDirName);
    const currentRunOriginalIndex = Number(
      allRunsArray[currentRunDirNameIndex].split("#")[1],
    );

    // Select RunInfo for this run
    const thisRunInfo = runInfo[currentRunOriginalIndex];

    // Create data directories
    const {
      participantRunDataDirPath,
      runCaptureDirPath,
      runFeatureVectorDirPath,
      runCaptionAudioDirPath,
    } = await _createDataDirs(resolvedDataPath, remainingRunsArray[0]);

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
}

async function _createDataDirs(resolvedDataPath: string, selectedRun: string) {
  // Create the run root directory
  const participantRunDataDirPath = resolve(resolvedDataPath, selectedRun);
  await mkdir(participantRunDataDirPath, { recursive: true });

  // Create sub directories
  const runCaptureDirPath = resolve(participantRunDataDirPath, "capture");
  await mkdir(runCaptureDirPath, { recursive: true });

  const runFeatureVectorDirPath = resolve(
    participantRunDataDirPath,
    "feature_vector",
  );
  await mkdir(runFeatureVectorDirPath, { recursive: true });

  const runCaptionAudioDirPath = resolve(
    participantRunDataDirPath,
    "caption_audio",
  );
  await mkdir(runCaptionAudioDirPath, { recursive: true });

  return {
    participantRunDataDirPath,
    runCaptureDirPath,
    runFeatureVectorDirPath,
    runCaptionAudioDirPath,
  };
}
