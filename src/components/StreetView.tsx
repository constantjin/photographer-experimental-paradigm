/* global google */

import { useEffect, useRef } from "react";
import { useAtomValue, useAtom, useSetAtom } from "jotai";

import {
  dataDirPathsAtom,
  currentRunInfoAtom,
  currentTrialNumberAtom,
} from "@/stores/experiment";
import { streetViewRefAtom, mapDivRefAtom } from "@/stores/streetview";
import { controllerEnabledAtom } from "@/stores/controller";
import {
  captureIntervalEnableAtom,
  capturePageLoadAtom,
} from "@/stores/capture";

import { reportAPIResponse } from "@/utils/api";
import { channels } from "@constants";

const initialPov = {
  heading: 34,
  pitch: 0,
};

const initialControlOptions: google.maps.StreetViewPanoramaOptions = {
  panControl: false,
  clickToGo: false,
  scrollwheel: false,
  linksControl: true,
  showRoadLabels: false,
  disableDefaultUI: true,
};

export function StreetView() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const currentRunInfo = useAtomValue(currentRunInfoAtom);
  const [, setCurrentTrialNumber] = useAtom(currentTrialNumberAtom);

  // Note: streetViewRefAtom -> used for updating/controlling the street view
  // mapDivRefAtom -> used for capturing the street view via html2canvas
  const mapRef = useRef<HTMLDivElement>(null);
  const [, setStreetViewRef] = useAtom(streetViewRefAtom);
  const [, setMapDivRef] = useAtom(mapDivRefAtom);

  const setControllerEnabled = useSetAtom(controllerEnabledAtom);
  const setCaptureIntervalEnable = useSetAtom(captureIntervalEnableAtom);

  const capturePageLoad = useAtomValue(capturePageLoadAtom);

  // Initialize the street view panorama.
  useEffect(() => {
    const initStreetView = async () => {
      setStreetViewRef(
        new window.google.maps.StreetViewPanorama(
          mapRef.current as HTMLDivElement,
          {
            position: currentRunInfo?.latlng,
            pov: initialPov,
            zoom: 0,
            ...initialControlOptions,
          },
        ),
      );
      mapRef.current?.focus();
      setMapDivRef(mapRef.current as HTMLDivElement);
      setCurrentTrialNumber(1); // Intial map load means first trial in a run

      await Promise.all([
        window.api
          .invoke(
            channels.WRITE_ETIME,
            dataDirPaths.participantRunDataDirPath,
            "trial_1",
          )
          .then((etimeResponse) => reportAPIResponse(etimeResponse)),
        window.api
          .invoke(
            channels.STREET.WRITE_ACTION,
            dataDirPaths.participantRunDataDirPath,
            "trial_1",
          )
          .then((actionResponse) => reportAPIResponse(actionResponse)),
      ]);

      setControllerEnabled(true);
      setCaptureIntervalEnable(true);
    };

    initStreetView();
  }, [
    currentRunInfo?.latlng,
    dataDirPaths.participantRunDataDirPath,
    setCurrentTrialNumber,
    setMapDivRef,
    setStreetViewRef,
    setCaptureIntervalEnable,
    setControllerEnabled,
  ]);

  return (
    <div
      ref={mapRef}
      id="streetview"
      className={`w-full h-full ${capturePageLoad ? "hidden" : ""}`}
    />
  );
}
