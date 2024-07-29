/*global NodeJS*/
import { useCallback, useEffect, useRef } from "react";
import {
  Wrapper as GoogleMapWrapper,
  Status as GoogleMapStatus,
} from "@googlemaps/react-wrapper";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import html2canvas from "html2canvas";

import { MapError } from "@/components/MapError";
import { MapLoading } from "@/components/MapLoading";
import { StreetView } from "@/components/StreetView";
import { GamepadInterface } from "@/components/GamepadInterface";
import { StreetViewControl } from "@/components/StreetViewControl";
import { CapturePage } from "@/components/CapturePage";

import {
  googleMapsAPIKeyAtom,
  dataDirPathsAtom,
  trialInfoAtom,
} from "@/stores/experiment";
import {
  captureIntervalEnableAtom,
  capturePageLoadAtom,
  base64EncodedCaptureAtom,
} from "@/stores/capture";
import { mapDivRefAtom, streetViewRefAtom } from "@/stores/streetview";

import { reportAPIResponse } from "@/utils/api";
import { delay } from "@/utils";
import { channels } from "@constants";

const renderMapComponentsByStatus = (status: GoogleMapStatus) => {
  if (status === GoogleMapStatus.FAILURE) {
    return <MapError />;
  }
  return <MapLoading />;
};

export function Exploration() {
  // Note: routes/Exploration.tsx mainly handles capture actions and shows
  // the street view map (StreetView.tsx) and event after capture (CapturePage.tsx).

  const googleMapsAPIKey = useAtomValue(googleMapsAPIKeyAtom);
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);
  const captureIntervalEnable = useAtomValue(captureIntervalEnableAtom);

  const [capturePageLoad, setCapturePageLoad] = useAtom(capturePageLoadAtom);

  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const captureIntervalInMs = trialInfo?.captureIntervalInMs ?? 20 * 1000;

  const mapDivRef = useAtomValue(mapDivRefAtom);
  const streetViewRef = useAtomValue(streetViewRefAtom);
  const setBase64EncodedCapture = useSetAtom(base64EncodedCaptureAtom);

  const captureStreetViewScene = useCallback(async () => {
    if (!mapDivRef) {
      console.error(
        "[PanoramaControl:captureStreetViewScene] Undefined mapDivRef.",
      );
      return;
    }

    streetViewRef?.setOptions({
      linksControl: false, // Hide map controls before capture
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
      linksControl: true, // Show map controls before capture
    });

    setBase64EncodedCapture(base64EncodedImage);
  }, [mapDivRef, setBase64EncodedCapture, streetViewRef]);

  const resetCaptureInterval = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  const setCaptureInterval = useCallback(() => {
    if (captureIntervalRef.current) {
      return;
    }

    // Automatically capture after the capture interval ("capture failed")
    captureIntervalRef.current = setInterval(async () => {
      await Promise.all([
        window.api
          .invoke(
            channels.WRITE_ETIME,
            dataDirPaths.participantRunDataDirPath,
            "capture_failed",
          )
          .then((etimeResponse) => reportAPIResponse(etimeResponse)),
        captureStreetViewScene(),
      ]);
      setCapturePageLoad(true);
    }, captureIntervalInMs);
  }, [
    captureIntervalInMs,
    captureStreetViewScene,
    dataDirPaths.participantRunDataDirPath,
    setCapturePageLoad,
  ]);

  // useEffect hook handles captureIntervalEnable state changes.
  // For example, if StreetView component is initialized, it will set captureIntervalEnable.
  // If the capture button is pressed, it will unset captureIntervalEnable.
  useEffect(() => {
    if (captureIntervalEnable) {
      console.log("[Exploration:useEffect] capture interval enabled");
      setCaptureInterval();
    } else {
      console.log("[Exploration:useEffect] capture interval disabled");
      resetCaptureInterval();
    }
  }, [captureIntervalEnable, setCaptureInterval, resetCaptureInterval]);

  // StreetView: shows the street view map
  // GamepadInterface: handles gamepad/joystick inputs
  // StreetViewControl: update the street view with repect to the gamepad inputs
  // CapturePage: handles post-capture event blocks
  return (
    <GoogleMapWrapper
      apiKey={googleMapsAPIKey ?? "google-maps-api-key-not-set"}
      version="weekly"
      language="en"
      region="US"
      render={renderMapComponentsByStatus}
    >
      <StreetView />
      <GamepadInterface />
      <StreetViewControl />
      {capturePageLoad && <CapturePage />}
    </GoogleMapWrapper>
  );
}
