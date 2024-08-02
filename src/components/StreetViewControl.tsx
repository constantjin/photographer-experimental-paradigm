/*global google, NodeJS*/

import { useEffect, useRef, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import html2canvas from "html2canvas";

import { dataDirPathsAtom } from "@/stores/experiment";
import { streetViewRefAtom, mapDivRefAtom } from "@/stores/streetview";
import {
  controllerActionAtom,
  controllerEnabledAtom,
} from "@/stores/controller";
import {
  capturePageLoadAtom,
  base64EncodedCaptureAtom,
} from "@/stores/capture";

import { delay } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import { channels } from "@constants";

export function StreetViewControl() {
  const streetViewRef = useAtomValue(streetViewRefAtom);
  const dataDirPaths = useAtomValue(dataDirPathsAtom);

  const mapDivRef = useAtomValue(mapDivRefAtom);
  const setBase64EncodedCapture = useSetAtom(base64EncodedCaptureAtom);

  const controllerAction = useAtomValue(controllerActionAtom);
  const controllerEnabled = useAtomValue(controllerEnabledAtom);

  const setCapturePageLoad = useSetAtom(capturePageLoadAtom);

  const actionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Component-specific constants to control smoothness of viewpoint or location change
  const viewpointChangeIntervalInMs = 20; //ms
  const locationChangeIntervalInMs = 1000; // ms

  // Helper functions to repeatedly call actionFunction() with an interval and stop the repetitions.
  // We use them to simulate smooth street view control.
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

  type ControllerAction = "stop" | "up" | "down" | "left" | "right" | "capture";
  const logControllerAction = useCallback(
    async (action: ControllerAction) => {
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
        channels.STREET.WRITE_ACTION,
        dataDirPaths.participantRunDataDirPath,
        jsonActionLog,
      );
      if (actionResponse.status === "error") {
        reportAPIResponse(actionResponse);
      }
    },
    [dataDirPaths.participantRunDataDirPath, streetViewRef],
  );

  // Action function - handle viewpoint changes (left or right joystick actions)
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

  // Action function - handle location changes (up or down joystick actions)
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
          // Move to the farthest location with respect to the current heading
          nextPanoId = mapLinks[linkLength - 1]?.pano;
        } else {
          // Move to the closest location with respect to the current heading
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
  // Note: This function is duplicate of captureStreetViewScene in Exploration.tsx
  // but handleCaptureAction() capture scenes by actual button press within the capture interval ('capture' event)
  // and captureStreetViewScene() automatically captures the scene after the interval ('capture_failed' event).
  // Maybe we need to unify these two functions in one capture function that handles both events?
  const handleCaptureAction = useCallback(async () => {
    resetActionInterval(); // Stops current movement
    const etimeResponse = await window.api.invoke(
      channels.WRITE_ETIME,
      dataDirPaths.participantRunDataDirPath,
      "capture",
    );
    reportAPIResponse(etimeResponse);

    if (!mapDivRef) {
      console.error(
        "[StreetViewControl:handleCaptureAction] Undefined mapDivRef.",
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

  // Register action commands by joystick action
  // Note: headingAmount values (0.8 or -0.8) in the viewPointChange() function are heuristic values.
  // You can freely change these values or viewpoint/locationChangeIntervalInMs constants
  // if you think the transition is too slow or too fast.
  useEffect(() => {
    if (controllerEnabled) {
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
    setCapturePageLoad,
    handleCaptureAction,
    logControllerAction,
  ]);

  return <div></div>;
}
