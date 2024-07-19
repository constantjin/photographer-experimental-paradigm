/*global google, NodeJS*/

import { useEffect, useRef, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
// import html2canvas from "html2canvas";

import { dataDirPathsAtom } from "@/stores/experiment";
import { streetViewRefAtom, mapDivRefAtom } from "@/stores/streetview";
import {
  controllerActionAtom,
  controllerEnabledAtom,
} from "@/stores/controller";
import {
  captureTimerEnabledAtom,
  capturePageLoadAtom,
  enableControllerActionAtom,
  base64EncodedCaptureAtom,
} from "@/stores/capture";

import { delay } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import html2canvas from "html2canvas";

export function PanoramaControlV2() {
  const streetViewRef = useAtomValue(streetViewRefAtom);
  // const mapDivRef = useAtomValue(mapDivRefAtom);
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const controllerAction = useAtomValue(controllerActionAtom);
  const controllerEnabled = useAtomValue(controllerEnabledAtom);
  const captureTimerEnabled = useAtomValue(captureTimerEnabledAtom);
  // const setCapturedVisible = useSetAtom(capturedVisibleAtom);
  // const currentTrialNumber = useAtomValue(currentTrialNumberAtom);

  const setCapturePageLoad = useSetAtom(capturePageLoadAtom);
  const enableControllerAction = useAtomValue(enableControllerActionAtom);

  const actionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Capture
  const mapDivRef = useAtomValue(mapDivRefAtom);
  const setBase64EncodedCapture = useSetAtom(base64EncodedCaptureAtom);

  // Component-specific constants
  const viewpointChangeIntervalInMs = 20; //ms
  const locationChangeIntervalInMs = 1000; // ms
  // const captureTimeoutInMs = 20 * 1000; // ms

  // Helper functions
  const setActionInterval = useCallback(
    (actionFunction: () => void, interval: number) => {
      resetActionInterval();
      actionFunction();
      actionIntervalRef.current = setInterval(() => {
        actionFunction();
      }, interval);
    },
    [],
  );

  const resetActionInterval = () => {
    if (actionIntervalRef.current) {
      clearInterval(actionIntervalRef.current);
      actionIntervalRef.current = null;
    }
  };

  // const setCaptureTimeout = useCallback((captureFunction: () => void, timeout: number) => {
  //   resetCaptureTimeout();
  //   captureTimeoutRef.current = setInterval(() => {
  //     captureFunction();
  //   }, timeout);
  // }, []);

  // const resetCaptureTimeout = () => {
  //   if (captureTimeoutRef.current) {
  //     clearInterval(captureTimeoutRef.current);
  //     captureTimeoutRef.current = null;
  //   }
  // };

  type ControllerAction = "stop" | "up" | "down" | "left" | "right" | "capture";
  const logControllerAction = async (action: ControllerAction) => {
    const pov = streetViewRef?.getPov();
    const coordinate = streetViewRef?.getPosition()?.toString();

    if (!coordinate || !pov) {
      return;
    }

    const jsonActionLog = JSON.stringify({
      action,
      coordinate,
      pov,
    });

    const actionResponse = await window.api.invoke(
      "street:write-action",
      dataDirPaths.participantRunDataDirPath,
      jsonActionLog,
    );
    if (actionResponse.status === "error") {
      reportAPIResponse(actionResponse);
    }
  };

  // Action function - viewpoint
  const viewPointChange = useCallback(
    (headingAmount: number) => {
      return () => {
        const currPov = streetViewRef?.getPov();
        const currHeading = currPov?.heading;
        if (currHeading) {
          streetViewRef?.setPov({
            ...currPov,
            heading: currHeading + headingAmount,
          });
        }
      };
    },
    [streetViewRef],
  );

  // Action function - link
  const locationChange = useCallback(
    (backward = false) => {
      return () => {
        const mapLinks = streetViewRef?.getLinks();
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
    },
    [streetViewRef],
  );

  // // Capture function
  const handleCaptureAction = useCallback(async () => {
    resetActionInterval();
    const etimeResponse = await window.api.invoke(
      "write-etime",
      dataDirPaths.participantRunDataDirPath,
      "capture",
    );
    reportAPIResponse(etimeResponse);

    if (!mapDivRef) {
      console.error(
        "[PanoramaControl:captureStreetViewScene] Undefined mapDivRef.",
      );
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

    streetViewRef?.setOptions({
      linksControl: true,
    });

    setBase64EncodedCapture(base64EncodedImage);

    setCapturePageLoad(true);
  }, [
    dataDirPaths.participantRunDataDirPath,
    mapDivRef,
    setBase64EncodedCapture,
    setCapturePageLoad,
    streetViewRef,
  ]);

  // const captureStreetViewScene = useCallback((success: boolean) => {
  //   return async () => {
  //     resetActionInterval();
  //     // // Show the Captured component
  //     // setCapturedVisible(true);
  //     const etimeResponse = await window.api.invoke(
  //       "write-etime",
  //       dataDirPaths.participantRunDataDirPath,
  //       `${success ? "capture" : "capture_failed"}`
  //     );
  //     reportAPIResponse(etimeResponse);

  //     if (!mapDivRef) {
  //       console.error(
  //         "[PanoramaControl:captureStreetViewScene] Undefined mapDivRef."
  //       );
  //       return;
  //     }

  //     streetViewRef?.setOptions({
  //       linksControl: false,
  //     });

  //     await delay(50);

  //     const capturedCanvas = await html2canvas(mapDivRef, {
  //       useCORS: true,
  //       backgroundColor: null,
  //     });
  //     const base64EncodedImage = capturedCanvas
  //     .toDataURL("image/png", 1.0)
  //     .substring("data:image/png;base64,".length);

  //     // Show the Captured component
  //     setCapturedVisible(true);
  //     const imageStoreResponse = await window.api.invoke(
  //       "street:store-capture",
  //       base64EncodedImage,
  //       dataDirPaths.runCaptureDirPath,
  //       `trial_${currentTrialNumber}`
  //     );
  //     reportAPIResponse(imageStoreResponse);

  //     streetViewRef?.setOptions({
  //       linksControl: true,
  //     });
  //   };
  // }, [currentTrialNumber, dataDirPaths.participantRunDataDirPath, dataDirPaths.runCaptureDirPath, mapDivRef, setCapturedVisible, streetViewRef]);

  // Register action commands
  useEffect(() => {
    // if (!controllerEnabled) {
    //   return;
    // }
    if (enableControllerAction) {
      logControllerAction(controllerAction);
      switch (controllerAction) {
        case "capture":
          handleCaptureAction();
          break;
        case "stop":
          resetActionInterval();
          break;
        case "left":
          setActionInterval(viewPointChange(-0.8), viewpointChangeIntervalInMs);
          break;
        case "right":
          setActionInterval(viewPointChange(0.8), viewpointChangeIntervalInMs);
          break;
        case "up":
          setActionInterval(locationChange(), locationChangeIntervalInMs);
          break;
        case "down":
          setActionInterval(locationChange(true), locationChangeIntervalInMs);
          break;
      }
    }
  }, [
    controllerAction,
    controllerEnabled,
    locationChange,
    setActionInterval,
    viewPointChange,
    captureTimerEnabled,
    enableControllerAction,
    setCapturePageLoad,
    handleCaptureAction,
  ]);

  // // Register capture timer
  // useEffect(() => {
  //   if (captureTimerEnabled) {
  //     console.log("capture interval was set.");
  //     setCaptureTimeout(captureStreetViewScene(false), captureTimeoutInMs);
  //   } else {
  //     console.log("capture interval was reset.");
  //     resetCaptureTimeout();
  //   }
  // }, [captureStreetViewScene, captureTimeoutInMs, captureTimerEnabled, setCaptureTimeout]);

  return <div></div>;
}
