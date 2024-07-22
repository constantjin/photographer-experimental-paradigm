import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { useGamepads } from "@/utils/awesome-react-gamepads";

import {
  ParticipantInput,
  RequirementDetail,
  RequirementIndicator,
} from "@/components/startpage";
import { reportAPIResponse } from "@/utils/api";
import {
  experimentalSettingAtom,
  dataDirPathsAtom,
  currentRunInfoAtom,
} from "@/stores/experiment";
import { channels } from "@constants";

export function StartPage() {
  const [settingLoadState, setSettingLoadState] = useState({
    status: "error",
    message: "Unloaded",
  });
  const [clipTextLoadState, setClipTextLoadState] = useState({
    status: "error",
    message: "Unloaded",
  });
  const [clipImageLoadState, setClipImageLoadState] = useState({
    status: "error",
    message: "Unloaded",
  });
  const [gamepadState, setGamepadState] = useState(false);

  const [participantData, setParticipantData] = useState({
    name: "",
    id: "",
  });
  const [registrationState, setRegistrationState] = useState({
    status: "",
    message: "",
  });
  const [canStartExperiment, setCanStartExperiment] = useState(false);

  const [experimentalSetting, setExperimentalSetting] = useAtom(
    experimentalSettingAtom,
  );
  const [, setDataDirPaths] = useAtom(dataDirPathsAtom);
  const [, setCurrentRunInfo] = useAtom(currentRunInfoAtom);

  const navigate = useNavigate();

  const initializeExperiment = async () => {
    const settingResponse = await window.api.invoke(channels.LOAD_SETTING);
    setSettingLoadState({
      status: settingResponse.status,
      message: settingResponse.message,
    });
    reportAPIResponse(settingResponse);

    if (settingResponse.status === "success") {
      const clipTextResponse = await window.api.invoke(
        channels.CLIP.LOAD_CLIP_TEXT,
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
        channels.CLIP.LOAD_CLIP_IMAGE,
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
      channels.REGISTER_PARTICIPANT,
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
      <ParticipantInput
        label="Name"
        placeholder="Participant Name (Initial only)"
        name="name"
        value={participantData.name}
        onChange={onChangeParticipantInput}
      />
      <ParticipantInput
        label="ID"
        placeholder="Participant ID"
        name="id"
        value={participantData.id}
        onChange={onChangeParticipantInput}
      />
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
            className="w-full bg-yellow-500 hover:bg-green-400 focus:shadow-outline focus:outline-none 
            text-black font-bold mt-2 py-2 px-4 rounded"
            type="button"
            onClick={startExperiment}
          >
            Start Experiment
          </button>
        )}
      </div>
      <hr className="my-6" />
      <RequirementDetail
        summary={
          <>
            <span>⚙️ Setting</span>
            <label>
              {settingLoadState.status === "success"
                ? "✔️ Loaded"
                : "❌ Unloaded"}
            </label>
          </>
        }
        detailed={
          <RequirementIndicator
            label={
              <button
                className="border border-gray-300 hover:text-yellow-300 focus:shadow-outline 
                focus:outline-none py-1 px-2 rounded"
                type="button"
                onClick={initializeExperiment}
              >
                Load Settings
              </button>
            }
            requirementState={settingLoadState}
          />
        }
      />

      <RequirementDetail
        summary={
          <>
            <span>📎 CLIP</span>
            <label>
              {clipTextLoadState.status === "success" &&
              clipImageLoadState.status === "success"
                ? "✔️ Loaded"
                : "❌ Unloaded"}
            </label>
          </>
        }
        detailed={
          <div className="flex flex-col">
            <RequirementIndicator
              label={
                <label className="py-1 px-2">
                  CLIP-<b>Text</b>
                </label>
              }
              requirementState={clipTextLoadState}
            />
            <RequirementIndicator
              label={
                <label className="py-1 px-2">
                  CLIP-<b>Image</b>
                </label>
              }
              requirementState={clipImageLoadState}
            />
          </div>
        }
      />

      <RequirementDetail
        summary={
          <>
            <span>🕹️ Controller</span>
            <label>{gamepadState ? "✔️ Connected" : "❌ Disconnected"}</label>
          </>
        }
        detailed={
          <p>
            After connecting the controller, please move the analogue stick.
          </p>
        }
      />
    </div>
  );
}
