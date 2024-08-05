import { useEffect, useState } from "react";
import { useSetAtom, useAtomValue, useAtom } from "jotai";

import {
  CrossFixationBeforePreview,
  CapturePreview,
  CrossFixationBeforeMultimodal,
  Multimodal,
  CrossFixationBeforeReward,
  Reward,
  CrossFixationAfterReward,
} from "@/components/events";

import {
  trialInfoAtom,
  currentTrialNumberAtom,
  trialEventStatusAtom,
  type TrialEvent,
} from "@/stores/experiment";
import { controllerEnabledAtom } from "@/stores/controller";
import { captureIntervalEnableAtom } from "@/stores/capture";

export function CapturePage() {
  const [trialEventStatus, setTrialEventStatus] = useAtom(trialEventStatusAtom);

  const setControllerEnabled = useSetAtom(controllerEnabledAtom);
  const setCaptureIntervalEnable = useSetAtom(captureIntervalEnableAtom);

  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);
  const trialInfo = useAtomValue(trialInfoAtom);
  const totalNumberOfTrials = trialInfo?.totalNumberOfTrials ?? 8;

  const [intialized, setInitialized] = useState(false);

  const trialEventStatusComponents: Record<TrialEvent, JSX.Element> = {
    fixation_before_preview: <CrossFixationBeforePreview />,
    capture_preview: <CapturePreview />,
    fixation_before_multimodal: <CrossFixationBeforeMultimodal />,
    multimodal: <Multimodal />,
    fixation_before_reward: <CrossFixationBeforeReward />,
    reward: <Reward />,
    fixation_after_reward: <CrossFixationAfterReward />,
  };

  useEffect(() => {
    const initTrialSequence = () => {
      // CapturePage is loaded -> Turn off captureInterval and controller actions
      setCaptureIntervalEnable(false);
      setControllerEnabled(false);
      setTrialEventStatus("fixation_before_preview");
      setInitialized(true);
    };

    initTrialSequence();

    return () => {
      console.log("[CapturePage] Unloaded capture page.");
      if (currentTrialNumber > totalNumberOfTrials) {
        console.log("[CapturePage] Run end");
      } else {
        setCaptureIntervalEnable(true);
        setControllerEnabled(true);
      }
    };
  }, [
    currentTrialNumber,
    setCaptureIntervalEnable,
    setControllerEnabled,
    setTrialEventStatus,
    totalNumberOfTrials,
  ]);

  return (
    <>
      {intialized &&
        trialEventStatus &&
        trialEventStatusComponents[trialEventStatus]}
    </>
  );
}
