import React from "react";
import { useNavigate } from "react-router-dom";
import { atom, useAtom } from "jotai";
import { useGamepads } from "@/utils/awesome-react-gamepads";

import { reportAPIResponse } from "@/utils/api";
import {
  experimentalSettingAtom,
  dataDirPathsAtom,
  currentRunInfoAtom,
} from "@/stores/experiment";

const gamepadStateAtom = atom(false);
const settingLoadStateAtom = atom({
  status: "error",
  message: "Unloaded",
});
const clipTextLoadStateAtom = atom({
  status: "error",
  message: "Unloaded",
});
const clipImageLoadStateAtom = atom({
  status: "error",
  message: "Unloaded",
});

const participantDataAtom = atom({
  name: "",
  id: "",
});
const registrationStateAtom = atom({
  status: "",
  message: "",
});

const canStartExperimentAtom = atom(false);

export function StartPage() {
  const [settingLoadState, setSettingLoadState] = useAtom(settingLoadStateAtom);
  const [clipTextLoadState, setClipTextLoadState] = useAtom(
    clipTextLoadStateAtom,
  );
  const [clipImageLoadState, setClipImageLoadState] = useAtom(
    clipImageLoadStateAtom,
  );
  const [gamepadState, setGamepadState] = useAtom(gamepadStateAtom);
  const [experimentalSetting, setExperimentalSetting] = useAtom(
    experimentalSettingAtom,
  );

  const [participantData, setParticipantData] = useAtom(participantDataAtom);
  const [registrationState, setRegistrationState] = useAtom(
    registrationStateAtom,
  );
  const [, setDataDirPaths] = useAtom(dataDirPathsAtom);
  const [, setCurrentRunInfo] = useAtom(currentRunInfoAtom);
  const [canStartExperiment, setCanStartExperiment] = useAtom(
    canStartExperimentAtom,
  );

  const navigate = useNavigate();

  const initializeExperiment = async () => {
    const settingResponse = await window.api.invoke("load-setting");
    setSettingLoadState({
      status: settingResponse.status,
      message: settingResponse.message,
    });
    reportAPIResponse(settingResponse);

    if (settingResponse.status === "success") {
      const clipTextResponse = await window.api.invoke(
        "clip:load-clip-text",
        settingResponse.data.clipTextModelPath,
      );
      setClipTextLoadState({
        status: clipTextResponse.status,
        message: clipTextResponse.message,
      });
      reportAPIResponse(clipTextResponse);
    }

    if (settingResponse.status === "success") {
      const clipImageResponse = await window.api.invoke(
        "clip:load-clip-image",
        settingResponse.data.clipImageModelPath,
      );
      setClipImageLoadState({
        status: clipImageResponse.status,
        message: clipImageResponse.message,
      });
      reportAPIResponse(clipImageResponse);
    }

    setExperimentalSetting(settingResponse.data);
  };

  const onChangeParticipantInput = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setParticipantData({
      ...participantData,
      [event.target.name]: event.target.value.toUpperCase(),
    });
  };

  const registerParticpant = async () => {
    const registerResponse = await window.api.invoke(
      "register-participant",
      experimentalSetting?.experimentalDataStorePath,
      participantData.name,
      participantData.id,
      experimentalSetting?.runInfo,
    );
    setRegistrationState({
      status: registerResponse.status,
      message: registerResponse.message,
    });

    if (registerResponse.status === "success") {
      setDataDirPaths(registerResponse.data.dataDirPaths);
      setCurrentRunInfo(registerResponse.data.currentRunInfo);
      setCanStartExperiment(true);
    }

    reportAPIResponse(registerResponse);
  };

  const startExperiment = () => {
    navigate("/sync");
  };

  useGamepads({
    onConnect(_) {
      setGamepadState(true);
    },
    onDisconnect(_) {
      setGamepadState(false);
    },
  });

  return (
    <div className="w-1/2">
      <div className="flex items-center mb-6">
        <div className="w-1/3">
          <label className="block text-white font-bold text-left mb-1 mb-0 pr-4">
            Name
          </label>
        </div>
        <div className="w-2/3">
          <input
            className="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-yellow-500"
            type="text"
            placeholder="Participant Name (Initial only)"
            name="name"
            onChange={onChangeParticipantInput}
            value={participantData.name}
            disabled={!experimentalSetting}
          />
        </div>
      </div>
      <div className="flex items-center mb-6">
        <div className="w-1/3">
          <label className="block text-white font-bold text-left mb-1 mb-0 pr-4">
            ID
          </label>
        </div>
        <div className="w-2/3">
          <input
            className="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-yellow-500"
            type="text"
            placeholder="Participant ID"
            onChange={onChangeParticipantInput}
            value={participantData.id}
            name="id"
            disabled={!experimentalSetting}
          />
        </div>
      </div>
      <div className="flex flex-col">
        {!canStartExperiment && (
          <button
            className={`w-full ${
              experimentalSetting &&
              participantData.name !== "" &&
              participantData.id !== ""
                ? "bg-yellow-500 hover:bg-green-400"
                : "bg-gray-500"
            } focus:shadow-outline focus:outline-none text-black font-bold py-2 px-4 my-2 rounded`}
            type="button"
            onClick={registerParticpant}
            disabled={
              !experimentalSetting ||
              participantData.name === "" ||
              participantData.id === ""
            }
          >
            Register / Load the participant
          </button>
        )}
        <p
          className={`text-left ${
            registrationState.status === "success" && "text-green-300"
          } ${registrationState.status === "error" && "text-red-300"}`}
        >
          {registrationState.message !== "" && registrationState.message}
        </p>
        {canStartExperiment && (
          <button
            className="w-full bg-yellow-500 hover:bg-green-400 focus:shadow-outline focus:outline-none text-black font-bold mt-2 py-2 px-4 rounded"
            type="button"
            onClick={startExperiment}
          >
            Start Experiment
          </button>
        )}
      </div>
      <hr className="my-6" />
      <details className="open:border open:border-gray-300 open:rounded-md mb-3">
        <summary className="bg-inherit flex justify-between w-full font-bold text-left text-white marker:text-white px-2 py-2 cursor-pointer hover:text-yellow-300">
          <span>⚙️ Setting</span>
          <label>
            {settingLoadState.status === "success"
              ? "✔️ Loaded"
              : "❌ Unloaded"}
          </label>
        </summary>
        <div className="flex items-center justify-between px-2 py-2 text-white">
          <button
            className="border border-gray-300 hover:text-yellow-300 focus:shadow-outline focus:outline-none py-1 px-2 rounded"
            type="button"
            onClick={initializeExperiment}
          >
            Load Settings
          </button>
          <p
            className={`truncate ${
              settingLoadState.status === "success"
                ? "text-green-300"
                : "text-red-300"
            }`}
          >
            {settingLoadState.message}
          </p>
        </div>
      </details>

      <details className="open:border open:border-gray-300 open:rounded-md mb-3">
        <summary className="bg-inherit flex justify-between w-full font-bold text-left text-white marker:text-white px-2 py-2 cursor-pointer hover:text-yellow-300">
          <span>📎 CLIP</span>
          <label>
            {clipTextLoadState.status === "success" &&
            clipImageLoadState.status === "success"
              ? "✔️ Loaded"
              : "❌ Unloaded"}
          </label>
        </summary>
        <div className="flex flex-col px-2 py-2 text-white">
          <div className="flex flex-row items-center justify-between">
            <label className="py-1 px-2">
              CLIP-<b>Text</b>
            </label>
            <p
              className={`truncate ${
                clipTextLoadState.status === "success"
                  ? "text-green-300"
                  : "text-red-300"
              }`}
            >
              {clipTextLoadState.message}
            </p>
          </div>
          <div className="flex flex-row items-center justify-between">
            <label className="py-1 px-2">
              CLIP-<b>Image</b>
            </label>
            <p
              className={`truncate ${
                clipImageLoadState.status === "success"
                  ? "text-green-300"
                  : "text-red-300"
              }`}
            >
              {clipImageLoadState.message}
            </p>
          </div>
        </div>
      </details>

      <details className="open:border open:border-gray-300 open:rounded-md mb-3">
        <summary className="bg-inherit flex justify-between w-full font-bold text-left text-white marker:text-white px-2 py-2 cursor-pointer hover:text-yellow-300">
          <span>🕹️ Controller</span>
          <label>{gamepadState ? "✔️ Connected" : "❌ Disconnected"}</label>
        </summary>
        <div className="flex items-center justify-between px-2 py-2 text-white">
          <p>
            After connecting the controller, please move the analogue stick.
          </p>
        </div>
      </details>
    </div>
  );
}
