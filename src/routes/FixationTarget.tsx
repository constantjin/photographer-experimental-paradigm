import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";

import { delay, jitter } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import {
  experimentalSettingAtom,
  dataDirPathsAtom,
  currentRunInfoAtom,
} from "@/stores/experiment";
import { clipTextFeatureAtom } from "@/stores/clip";
import { channels } from "@constants";

export function FixationTarget() {
  const experimentalSetting = useAtomValue(experimentalSettingAtom);
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const currentRunInfo = useAtomValue(currentRunInfoAtom);
  const setClipTextFeature = useSetAtom(clipTextFeatureAtom);

  const fixationTargetDurationInMs =
    experimentalSetting?.trialInfo.fixationDurationInMs ?? 5000; // default value for fixation duration;
  const jitterRatio = experimentalSetting?.trialInfo.fixationJitterRatio ?? 0.2; // default value for jitter ratio

  const navigate = useNavigate();

  useEffect(() => {
    const predictTextFeature = async () => {
      const jitteredDurationInMs = jitter(
        fixationTargetDurationInMs,
        jitterRatio,
      );

      await Promise.all([
        window.api
          .invoke(
            channels.WRITE_ETIME,
            dataDirPaths.participantRunDataDirPath,
            "fixation_target",
          )
          .then((etimeResponse) => reportAPIResponse(etimeResponse)),
        window.api
          .invoke(
            channels.CLIP.PREDICT_CLIP_TEXT,
            currentRunInfo?.captionTarget,
            dataDirPaths.runFeatureVectorDirPath,
            "text_feature",
          )
          .then((clipTextResponse) => {
            setClipTextFeature(clipTextResponse.data);
            reportAPIResponse(clipTextResponse);
          }),
        delay(jitteredDurationInMs),
      ]);

      navigate("/exploration");
    };
    predictTextFeature();
  }, [
    currentRunInfo?.captionTarget,
    dataDirPaths.participantRunDataDirPath,
    dataDirPaths.runFeatureVectorDirPath,
    fixationTargetDurationInMs,
    jitterRatio,
    navigate,
    setClipTextFeature,
  ]);

  return (
    <div className="flex items-center text-white max-w-lg">
      <p className="font-bold text-5xl">+</p>
    </div>
  );
}
