import { useEffect } from "react";
import { useSetAtom, useAtomValue } from "jotai";

import {
  dataDirPathsAtom,
  trialInfoAtom,
  currentTrialNumberAtom,
  trialEventStatusAtom,
} from "@/stores/experiment";
import { base64EncodedCaptureAtom } from "@/stores/capture";
import { clipImageFeatureAtom } from "@/stores/clip";

import { delay, noramlizeImageBuffer } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import { channels } from "@constants";

// Goal: resize and predict CLIP-Image feature during preview
export function CapturePreview() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);
  const base64EncodedCapture = useAtomValue(base64EncodedCaptureAtom);
  const setClipImageFeature = useSetAtom(clipImageFeatureAtom);

  const setTrialEventStatus = useSetAtom(trialEventStatusAtom);

  const fixationDurationInMs = trialInfo?.capturePreviewDurationInMs ?? 2000;

  useEffect(() => {
    const resizeNormalizeCLIPImage = async () => {
      const resizeResponse = await window.api.invoke(
        channels.CLIP.RESIZE_IMAGE,
        `data:image/png;base64,${base64EncodedCapture}`,
      );
      reportAPIResponse(resizeResponse);
      const normalizedData = await noramlizeImageBuffer(resizeResponse.data);

      const clipImageResponse = await window.api.invoke(
        channels.CLIP.PREDICT_CLIP_IMAGE,
        normalizedData,
        dataDirPaths.runFeatureVectorDirPath,
        `image_feature_trial_${currentTrialNumber}`,
      );
      reportAPIResponse(clipImageResponse);
      setClipImageFeature(clipImageResponse.data);
    };

    const init = async () => {
      await Promise.all([
        window.api
          .invoke(
            channels.WRITE_ETIME,
            dataDirPaths.participantRunDataDirPath,
            "trial_preview",
          )
          .then((etimeResponse) => reportAPIResponse(etimeResponse)),
        resizeNormalizeCLIPImage(),
        delay(fixationDurationInMs),
      ]);

      setTrialEventStatus("fixation_before_multimodal");
    };

    init();
  }, [
    base64EncodedCapture,
    currentTrialNumber,
    dataDirPaths.participantRunDataDirPath,
    dataDirPaths.runFeatureVectorDirPath,
    fixationDurationInMs,
    setClipImageFeature,
    setTrialEventStatus,
  ]);

  return (
    <div>
      <img src={`data:image/png;base64,${base64EncodedCapture}`} />
    </div>
  );
}
