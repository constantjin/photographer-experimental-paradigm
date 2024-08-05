import { useEffect } from "react";
import { useSetAtom, useAtomValue } from "jotai";

import {
  dataDirPathsAtom,
  trialInfoAtom,
  trialEventStatusAtom,
} from "@/stores/experiment";

import { jitter, delay } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import { channels } from "@constants";

export function CrossFixationBeforeReward() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
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
        delay(jitteredFixationCaptureDurationInMs),
      ]);

      setTrialEventStatus("reward");
    };

    init();
  }, [
    dataDirPaths.participantRunDataDirPath,
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
