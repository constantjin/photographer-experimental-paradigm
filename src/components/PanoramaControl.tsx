/*global google, NodeJS*/

import { useEffect, useRef, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import html2canvas from "html2canvas";

import { dataDirPathsAtom, currentTrialNumberAtom } from "@/stores/experiment";
import { mapDivRefAtom, streetViewRefAtom } from "@/stores/streetview";
import {
  controllerActionAtom,
  controllerEnabledAtom,
} from "@/stores/controller";
import { captureTimerEnabledAtom, capturedVisibleAtom } from "@/stores/capture";

import { delay } from "@/utils";
import { reportAPIResponse } from "@/utils/api";

export function PanoramaControl() {
  const streetViewRef = useAtomValue(streetViewRefAtom);
  const mapDivRef = useAtomValue(mapDivRefAtom);
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const controllerAction = useAtomValue(controllerActionAtom);
  const controllerEnabled = useAtomValue(controllerEnabledAtom);
  const captureTimerEnabled = useAtomValue(captureTimerEnabledAtom);
  const setCapturedVisible = useSetAtom(capturedVisibleAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);

  const actionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Component-specific constants
  const viewpointChangeIntervalInMs = 20; //ms
  const locationChangeIntervalInMs = 1000; // ms
  const captureTimeoutInMs = 20 * 1000; // ms

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

  const setCaptureTimeout = useCallback(
    (captureFunction: () => void, timeout: number) => {
      resetCaptureTimeout();
      captureTimeoutRef.current = setInterval(() => {
        captureFunction();
      }, timeout);
    },
    [],
  );

  const resetCaptureTimeout = () => {
    if (captureTimeoutRef.current) {
      clearInterval(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }
  };

  // type ControllerAction = "stop" | "up" | "down" | "left" | "right" | "capture";
  // const logControllerAction = (action: ControllerAction) => {
  //   const pov = streetViewRef?.getPov();
  //   const coordinate = streetViewRef?.getPosition()?.toString();

  //   if (!coordinate || !pov) {
  //     return;
  //   }

  //   console.log(
  //     JSON.stringify({
  //       action,
  //       coordinate,
  //       pov,
  //     })
  //   );
  // };

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

  // Capture function
  const captureStreetViewScene = useCallback(
    (success: boolean) => {
      return async () => {
        resetActionInterval();
        // // Show the Captured component
        // setCapturedVisible(true);
        const etimeResponse = await window.api.invoke(
          "write-etime",
          dataDirPaths.participantRunDataDirPath,
          `${success ? "capture" : "capture_failed"}`,
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

        // Show the Captured component
        setCapturedVisible(true);
        const imageStoreResponse = await window.api.invoke(
          "street:store-capture",
          base64EncodedImage,
          dataDirPaths.runCaptureDirPath,
          `trial_${currentTrialNumber}`,
        );
        reportAPIResponse(imageStoreResponse);

        streetViewRef?.setOptions({
          linksControl: true,
        });
      };
    },
    [
      currentTrialNumber,
      dataDirPaths.participantRunDataDirPath,
      dataDirPaths.runCaptureDirPath,
      mapDivRef,
      setCapturedVisible,
      streetViewRef,
    ],
  );

  // Register action commands
  useEffect(() => {
    // if (!controllerEnabled) {
    //   return;
    // }
    if (captureTimerEnabled) {
      if (controllerAction === "capture") {
        console.log("manual capture ran");
        captureStreetViewScene(true)();
      } else {
        // logControllerAction(controllerAction);
        switch (controllerAction) {
          case "stop":
            resetActionInterval();
            break;
          case "left":
            setActionInterval(
              viewPointChange(-0.8),
              viewpointChangeIntervalInMs,
            );
            break;
          case "right":
            setActionInterval(
              viewPointChange(0.8),
              viewpointChangeIntervalInMs,
            );
            break;
          case "up":
            setActionInterval(locationChange(), locationChangeIntervalInMs);
            break;
          case "down":
            setActionInterval(locationChange(true), locationChangeIntervalInMs);
            break;
        }
      }
    }
  }, [
    captureStreetViewScene,
    controllerAction,
    controllerEnabled,
    locationChange,
    setActionInterval,
    viewPointChange,
    captureTimerEnabled,
  ]);

  // Register capture timer
  useEffect(() => {
    if (captureTimerEnabled) {
      console.log("capture interval was set.");
      setCaptureTimeout(captureStreetViewScene(false), captureTimeoutInMs);
    } else {
      console.log("capture interval was reset.");
      resetCaptureTimeout();
    }
  }, [
    captureStreetViewScene,
    captureTimeoutInMs,
    captureTimerEnabled,
    setCaptureTimeout,
  ]);

  return <div></div>;
}
