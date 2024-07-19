import { useEffect, useCallback } from "react";
import { useSetAtom, useAtomValue } from "jotai";

import { currentTrialNumberAtom, dataDirPathsAtom } from "@/stores/experiment";
// import { capturedStateAtom } from "@/stores/streetview";
import {
  controllerEnabledAtom,
  controllerActionAtom,
} from "@/stores/controller";
import { captureTimerEnabledAtom, capturedVisibleAtom } from "@/stores/capture";

import { jitter, delay } from "@/utils";
import { reportAPIResponse } from "@/utils/api";

export function Captured() {
  // Page-specific constants
  const fixationCaptureDurationInMs = 2000; // ms
  const jitterRatio = 0.2;

  const setControllerEnabled = useSetAtom(controllerEnabledAtom);
  const setCaptureTimerEnabled = useSetAtom(captureTimerEnabledAtom);
  const setCapturedVisible = useSetAtom(capturedVisibleAtom);
  const setControllerAction = useSetAtom(controllerActionAtom);
  // const [capturedState, setCapturedState] = useAtom(capturedStateAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);
  const setCurrentTrialNumber = useSetAtom(currentTrialNumberAtom);
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  // const [currentTrialNumber, setCurrentTrialNumber] = useAtom(
  //   currentTrialNumberAtom
  // );

  const initCaptured = useCallback(async () => {
    // Turn off the capture timer
    setCaptureTimerEnabled(false);
    // Turn off the controller
    setControllerEnabled(false);
    setControllerAction("stop");

    const jitteredFixationCaptureDurationInMs = jitter(
      fixationCaptureDurationInMs,
      jitterRatio,
    );
    await delay(jitteredFixationCaptureDurationInMs);

    // Increase the current trial number
    const newTrialNumber = currentTrialNumber + 1;
    setCurrentTrialNumber(newTrialNumber);
    const etimeResponse = await window.api.invoke(
      "write-etime",
      dataDirPaths.participantRunDataDirPath,
      `trial_${newTrialNumber}`,
    );
    reportAPIResponse(etimeResponse);

    // Set the Captured component invisible
    setCapturedVisible(false);
  }, [
    currentTrialNumber,
    dataDirPaths.participantRunDataDirPath,
    setCaptureTimerEnabled,
    setCapturedVisible,
    setControllerAction,
    setControllerEnabled,
    setCurrentTrialNumber,
  ]);

  useEffect(() => {
    initCaptured();

    return () => {
      // Turn on the timer
      setCaptureTimerEnabled(true);
      // Turn on the controller
      setControllerEnabled(true);
    };
  }, [initCaptured, setCaptureTimerEnabled, setControllerEnabled]);

  return (
    <div className="flex items-center text-white max-w-lg">
      <p className="font-bold text-5xl">+</p>
    </div>
  );
}
