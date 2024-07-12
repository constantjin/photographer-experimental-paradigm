import { useEffect, useRef } from "react";
import { useGamepads } from "@/utils/awesome-react-gamepads";
import { useAtomValue, useAtom } from "jotai";
import html2canvas from "html2canvas";

import {
  mapDivRefAtom,
  streetViewRefAtom,
  streetViewLogAtom,
  capturedStateAtom,
} from "@/stores/streetview";
import { dataDirPathsAtom, currentTrialNumberAtom } from "@/stores/experiment";
import { reportAPIResponse } from "@/utils/api";
import { delay } from "@/utils";

type StreetViewAction = "stop" | "up" | "down" | "left" | "right" | "capture";

export function GamepadController() {
  const streetViewRef = useAtomValue(streetViewRefAtom);
  const mapDivRef = useAtomValue(mapDivRefAtom);
  const [, setStreetViewLog] = useAtom(streetViewLogAtom);
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);
  const [capturedState, setCapturedState] = useAtom(capturedStateAtom);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const explorationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const explorationTimeoutDelay = 20 * 1000;
  const viewpointChangeDelay = 20;
  const locationChangeDelay = 1000;

  // Helper functions
  const stopStreetViewChange = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const logStreetViewAction = (action: StreetViewAction) => {
    const currPov = streetViewRef?.getPov();
    const currCoordinate = streetViewRef?.getPosition()?.toString();

    if (!currCoordinate || !currPov) {
      return;
    }

    setStreetViewLog({
      action,
      coordinate: currCoordinate,
      pov: currPov,
    });
  };

  // Main viewpoint / location change handler
  const startStreetViewViewpointChange = (headingAmount: number) => {
    if (intervalRef.current) {
      stopStreetViewChange();
    }

    intervalRef.current = setInterval(() => {
      const currPov = streetViewRef?.getPov();
      const currHeading = currPov?.heading;
      if (currHeading) {
        streetViewRef?.setPov({
          ...currPov,
          heading: currHeading + headingAmount,
        });
      }
    }, viewpointChangeDelay);
  };

  const startStreetViewLocationChange = (backward = false) => {
    if (intervalRef.current) {
      stopStreetViewChange();
    }

    _moveToLinkDirection(backward);
    intervalRef.current = setInterval(
      () => _moveToLinkDirection(backward),
      locationChangeDelay
    );
  };

  const backwardStreetViewLocationChange = () => {
    startStreetViewLocationChange(true);
  };

  const _moveToLinkDirection = (backward = false) => {
    let mapLinks = streetViewRef?.getLinks();
    const linkLength = mapLinks?.length;
    const currPov = streetViewRef?.getPov();
    const currHeading = currPov?.heading;

    if (!mapLinks || !linkLength || linkLength === 0 || !currHeading) {
      return;
    }

    const difference = (link: google.maps.StreetViewLink | null) => {
      if (!link?.heading) {
        return -Infinity;
      }
      let diff = Math.abs((currHeading % 360) - link.heading);
      if (diff > 180) {
        diff = Math.abs(360 - diff);
      }
      return diff;
    };

    mapLinks.sort((link1, link2) => {
      return difference(link1) - difference(link2);
    });

    let nextPanoId;
    if (backward) {
      nextPanoId = mapLinks[linkLength - 1]?.pano;
    } else {
      nextPanoId = mapLinks[0]?.pano;
    }
    if (nextPanoId) {
      streetViewRef?.setPano(nextPanoId);
    }
  };

  // Capture mode
  const resetExplorationTimeout = () => {
    if (explorationTimeoutRef.current) {
      clearTimeout(explorationTimeoutRef.current);
      explorationTimeoutRef.current = null;
    }
  };

  const setExplorationTimeout = async () => {
    if (explorationTimeoutRef.current) {
      resetExplorationTimeout();
    }

    const etimeResponse = await window.api.invoke(
      "write-etime",
      dataDirPaths.participantRunDataDirPath,
      `trial_${currentTrialNumber}`
    );
    reportAPIResponse(etimeResponse);

    explorationTimeoutRef.current = setTimeout(
      () => captureStreetViewScene(),
      explorationTimeoutDelay
    );
  };

  const captureStreetViewScene = async () => {
    stopStreetViewChange();
    const etimeResponse = await window.api.invoke(
      "write-etime",
      dataDirPaths.participantRunDataDirPath,
      "capture"
    );
    reportAPIResponse(etimeResponse);

    if (!mapDivRef) {
      console.error("ERROR: no street view was found.");
      return;
    }

    streetViewRef?.setOptions({
      linksControl: false,
    });

    await delay(50);

    const capturedCanvas = await html2canvas(mapDivRef, {
      useCORS: true,
      backgroundColor: null,
    });

    const base64EncodedImage = capturedCanvas
      .toDataURL("image/png", 1.0)
      .substring("data:image/png;base64,".length);
    const imageStoreResponse = await window.api.invoke(
      "street:store-capture",
      base64EncodedImage,
      dataDirPaths.runCaptureDirPath,
      `trial_${currentTrialNumber}`
    );
    reportAPIResponse(imageStoreResponse);

    streetViewRef?.setOptions({
      linksControl: true,
    });

    logStreetViewAction("capture");

    setCapturedState({
      enterCaptured: true,
      exitCaptured: false,
    });
  };

  // Gamepad API handler
  useGamepads({
    onGamepadAxesChange(axes) {
      const isCapturedState = capturedState.enterCaptured;
      if (isCapturedState) {
        console.log("exploration should not run");
        return;
      }
      switch (axes.axesName) {
        case "LeftStickY":
          if (axes.value === 0) {
            stopStreetViewChange();
            logStreetViewAction("stop");
          } else if (axes.value === -1) {
            backwardStreetViewLocationChange();
            logStreetViewAction("down");
          } else if (axes.value === 1) {
            startStreetViewLocationChange();
            logStreetViewAction("up");
          }
          break;
        case "LeftStickX":
          if (axes.value === 0) {
            stopStreetViewChange();
            logStreetViewAction("stop");
          } else if (axes.value === -1) {
            startStreetViewViewpointChange(-0.8);
            logStreetViewAction("left");
          } else if (axes.value === 1) {
            startStreetViewViewpointChange(0.8);
            logStreetViewAction("right");
          }
          break;
      }
    },
    onGamepadButtonDown(button) {
      if (button.buttonIndex === 0) {
        // stopStreetViewChange();
        captureStreetViewScene();
        // logStreetViewAction("capture");
      }
    },
  });

  useEffect(() => {
    if (capturedState.exitCaptured) {
      console.log("New setExplorationTimeout()");
      setExplorationTimeout();
    }
  }, [capturedState.exitCaptured]);

  // useEffect(() => {
  //   console.log("Initial setExplorationTimeout()");
  //   setExplorationTimeout();
  // }, []);

  return <div></div>;
}
