/*global NodeJS*/
import { useCallback, useEffect, useRef } from "react";
import {
  Wrapper as GoogleMapWrapper,
  Status as GoogleMapStatus,
} from "@googlemaps/react-wrapper";
import { useAtomValue, useSetAtom } from "jotai";

import { MapError } from "@/components/MapError";
import { MapLoading } from "@/components/MapLoading";
import { Panorama } from "@/components/Panorama";
// import { Controller } from "@/components/Controller";
// import { PanoramaControl } from "@/components/PanoramaControl";
// import { Captured } from "@/components/Captured";
import { Controller } from "@/components/Controller";
import { PanoramaControlV2 } from "@/components/PanoramaControlV2";
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
import html2canvas from "html2canvas";
import { delay } from "@/utils";
import { channels } from "@constants";

const renderMapComponentsByStatus = (status: GoogleMapStatus) => {
  if (status === GoogleMapStatus.FAILURE) {
    return <MapError />;
  }
  return <MapLoading />;
};

export function Exploration() {
  const googleMapsAPIKey = useAtomValue(googleMapsAPIKeyAtom);
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);
  // const capturedVisible = useAtomValue(capturedVisibleAtom);
  const captureIntervalEnable = useAtomValue(captureIntervalEnableAtom);

  // New
  const setCapturePageLoad = useSetAtom(capturePageLoadAtom);
  const capturePageLoad = useAtomValue(capturePageLoadAtom);

  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // const captureIntervalInMs = 20 * 1000; // ms
  const captureIntervalInMs = trialInfo?.captureIntervalInMs ?? 20 * 1000;

  // Capture
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
  }, [mapDivRef, setBase64EncodedCapture, streetViewRef]);

  const resetCaptureInterval = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  const setCaptureInterval = useCallback(() => {
    // resetCaptureInterval()
    if (captureIntervalRef.current) {
      return;
    }

    captureIntervalRef.current = setInterval(async () => {
      const etimeResponse = await window.api.invoke(
        channels.WRITE_ETIME,
        dataDirPaths.participantRunDataDirPath,
        "capture_failed",
      );
      reportAPIResponse(etimeResponse);
      await captureStreetViewScene();
      setCapturePageLoad(true);
    }, captureIntervalInMs);
  }, [
    captureIntervalInMs,
    captureStreetViewScene,
    dataDirPaths.participantRunDataDirPath,
    setCapturePageLoad,
  ]);

  useEffect(() => {
    if (captureIntervalEnable) {
      console.log("[Exploration:useEffect] capture interval enabled");
      setCaptureInterval();
    } else {
      console.log("[Exploration:useEffect] capture interval disabled");
      resetCaptureInterval();
    }
  }, [captureIntervalEnable, setCaptureInterval, resetCaptureInterval]);

  return (
    <GoogleMapWrapper
      apiKey={googleMapsAPIKey ?? "google-maps-api-key-not-set"}
      version="weekly"
      language="en"
      region="US"
      render={renderMapComponentsByStatus}
    >
      <Panorama />
      {/* <PanoramaControl />
      <Controller /> */}
      {/* {capturedVisible && <Captured />} */}
      <Controller />
      <PanoramaControlV2 />
      {capturePageLoad && <CapturePage />}
    </GoogleMapWrapper>
  );
}
