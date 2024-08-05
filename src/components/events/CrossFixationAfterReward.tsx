import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSetAtom, useAtomValue } from "jotai";

import {
  dataDirPathsAtom,
  trialInfoAtom,
  currentTrialNumberAtom,
} from "@/stores/experiment";
import { capturePageLoadAtom } from "@/stores/capture";

import { jitter, delay } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import { channels } from "@constants";

// Goal: check whether it is the end of experiment OR the end of this trial
export function CrossFixationAfterReward() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);
  const setCurrentTrialNumber = useSetAtom(currentTrialNumberAtom);

  const setCapturePageLoad = useSetAtom(capturePageLoadAtom);

  const navigate = useNavigate();

  const fixationDurationInMs = trialInfo?.fixationDurationInMs ?? 5000;
  const jitterRatio = trialInfo?.fixationJitterRatio ?? 0.2;
  const totalNumberOfTrials = trialInfo?.totalNumberOfTrials ?? 8;

  useEffect(() => {
    const init = async () => {
      const jitteredFixationCaptureDurationInMs = jitter(
        fixationDurationInMs,
        jitterRatio,
      );

      await Promise.all([
        window.api
          .invoke(
            channels.WRITE_ETIME,
            dataDirPaths.participantRunDataDirPath,
            "trial_fixation",
          )
          .then((etimeResponse) => reportAPIResponse(etimeResponse)),
        delay(jitteredFixationCaptureDurationInMs),
      ]);

      // Last event block of each trial -> checks whether it is the last trial
      const newTrialNumber = currentTrialNumber + 1;
      if (newTrialNumber > totalNumberOfTrials) {
        navigate("/end");
      } else {
        // Unload the CapturePage and this will show/load the StreetView component
        // Note: DO NOT directly update currentTrialNumer in here (CapturePage is visible yet)
        // If not, the updated currentTrialNumer will re-render all components that depends on
        // currentTrialNumer (especially CapturePage).
        setCapturePageLoad(false);
      }
    };

    init();
  }, [
    currentTrialNumber,
    dataDirPaths.participantRunDataDirPath,
    fixationDurationInMs,
    jitterRatio,
    navigate,
    setCapturePageLoad,
    setCurrentTrialNumber,
    totalNumberOfTrials,
  ]);
  return (
    <div className="flex items-center text-white max-w-lg">
      <p className="font-bold text-5xl">+</p>
    </div>
  );
}
