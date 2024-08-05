import { useEffect } from "react";
import { useSetAtom, useAtomValue } from "jotai";

import {
  dataDirPathsAtom,
  trialInfoAtom,
  currentTrialNumberAtom,
  trialEventStatusAtom,
} from "@/stores/experiment";
import { base64EncodedCaptureAtom } from "@/stores/capture";

import { jitter, delay } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import { channels } from "@constants";

// Goal: save the captured image during cross fixation
export function CrossFixationBeforePreview() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);
  const base64EncodedCapture = useAtomValue(base64EncodedCaptureAtom);
  const trialInfo = useAtomValue(trialInfoAtom);

  const setTrialEventStatus = useSetAtom(trialEventStatusAtom);

  const fixationDurationInMs = trialInfo?.fixationDurationInMs ?? 5000;
  const jitterRatio = trialInfo?.fixationJitterRatio ?? 0.2;

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
        window.api
          .invoke(
            channels.STREET.STORE_CAPTURE,
            base64EncodedCapture,
            dataDirPaths.runCaptureDirPath,
            `trial_${currentTrialNumber}`,
          )
          .then((imageStoreResponse) => reportAPIResponse(imageStoreResponse)),
        delay(jitteredFixationCaptureDurationInMs),
      ]);

      setTrialEventStatus("capture_preview");
    };

    init();
  }, [
    base64EncodedCapture,
    currentTrialNumber,
    dataDirPaths.participantRunDataDirPath,
    dataDirPaths.runCaptureDirPath,
    fixationDurationInMs,
    jitterRatio,
    setTrialEventStatus,
  ]);

  return (
    <div className="flex items-center text-white max-w-lg">
      <p className="font-bold text-5xl">+</p>
    </div>
  );
}
