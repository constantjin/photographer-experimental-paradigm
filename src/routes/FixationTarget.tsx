import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";

import { delay, jitter } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import { dataDirPathsAtom, currentRunInfoAtom } from "@/stores/experiment";
import { clipTextFeatureAtom } from "@/stores/clip";

export function FixationTarget() {
  // Page-specific constants
  const fixationTargetDurationInMs = 5000; // ms
  const jitterRatio = 0.2;

  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const currentRunInfo = useAtomValue(currentRunInfoAtom);
  const setClipTextFeature = useSetAtom(clipTextFeatureAtom);

  const navigate = useNavigate();

  const predictTextFeature = useCallback(async () => {
    const jitteredDurationInMs = jitter(
      fixationTargetDurationInMs,
      jitterRatio
    );
    const startTime = performance.now();

    const etimeResponse = await window.api.invoke(
      "write-etime",
      dataDirPaths.participantRunDataDirPath,
      "fixation_target"
    );
    reportAPIResponse(etimeResponse);

    const clipTextResponse = await window.api.invoke(
      "clip:predict-clip-text",
      currentRunInfo?.captionTarget,
      dataDirPaths.runFeatureVectorDirPath,
      "text_feature"
    );
    reportAPIResponse(clipTextResponse);
    setClipTextFeature(clipTextResponse.data);
    const endTime = performance.now();

    const totalDelay = endTime - startTime;
    if (totalDelay < jitteredDurationInMs) {
      await delay(fixationTargetDurationInMs - totalDelay);
    }
    navigate("/exploration");
  }, [currentRunInfo?.captionTarget, dataDirPaths.participantRunDataDirPath, dataDirPaths.runFeatureVectorDirPath, navigate, setClipTextFeature]);

  useEffect(() => {
    predictTextFeature();
  }, [predictTextFeature]);

  return (
    <div className="flex items-center text-white max-w-lg">
      <p className="font-bold text-5xl">+</p>
    </div>
  );
}
