/* global google */

import { useState, useEffect, useRef } from "react";
import { useAtomValue, useAtom, useSetAtom } from "jotai";

import {
  dataDirPathsAtom,
  currentRunInfoAtom,
  currentTrialNumberAtom,
} from "@/stores/experiment";
import {
  streetViewRefAtom,
  mapDivRefAtom,
  // capturedStateAtom,
} from "@/stores/streetview";
import { controllerEnabledAtom } from "@/stores/controller";
import {
  captureTimerEnabledAtom,
  captureIntervalEnableAtom,
  enableControllerActionAtom,
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

export function Panorama() {
  const [, setStreetViewInit] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const [, setStreetViewRef] = useAtom(streetViewRefAtom);
  const [, setMapDivRef] = useAtom(mapDivRefAtom);
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const currentRunInfo = useAtomValue(currentRunInfoAtom);
  const [, setCurrentTrialNumber] = useAtom(currentTrialNumberAtom);
  // const capturedState = useAtomValue(capturedStateAtom);
  const setControllerEnabled = useSetAtom(controllerEnabledAtom);
  const setCaptureTimerEnabled = useSetAtom(captureTimerEnabledAtom);
  // const capturedVisible = useAtomValue(capturedVisibleAtom);

  // New
  const setCaptureIntervalEnable = useSetAtom(captureIntervalEnableAtom);
  const setEnableControllerAction = useSetAtom(enableControllerActionAtom);
  const capturePageLoad = useAtomValue(capturePageLoadAtom);

  // initialize the street view panorama.
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
      setCurrentTrialNumber(1);
      const etimeResponse = await window.api.invoke(
        channels.WRITE_ETIME,
        dataDirPaths.participantRunDataDirPath,
        "trial_1",
      );
      reportAPIResponse(etimeResponse);
      const actionResponse = await window.api.invoke(
        channels.STREET.WRITE_ACTION,
        dataDirPaths.participantRunDataDirPath,
        "trial_1",
      );
      reportAPIResponse(actionResponse);
      setStreetViewInit(true);
      setControllerEnabled(true);
      setCaptureTimerEnabled(true);

      // New
      setCaptureIntervalEnable(true);
      setEnableControllerAction(true);
    };

    initStreetView();
  }, [
    currentRunInfo?.latlng,
    dataDirPaths.participantRunDataDirPath,
    setCaptureIntervalEnable,
    setCaptureTimerEnabled,
    setControllerEnabled,
    setCurrentTrialNumber,
    setEnableControllerAction,
    setMapDivRef,
    setStreetViewInit,
    setStreetViewRef,
  ]);

  return (
    <div
      ref={mapRef}
      id="streetview"
      className={`w-full h-full ${capturePageLoad ? "hidden" : ""}`}
    />
  );
}
