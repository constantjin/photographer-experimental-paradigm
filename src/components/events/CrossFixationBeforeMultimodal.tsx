import { useEffect } from "react";
import { useSetAtom, useAtomValue } from "jotai";

import {
  dataDirPathsAtom,
  trialInfoAtom,
  currentTrialNumberAtom,
  azureAPIUrlAtom,
  azureAPIKeyAtom,
  googleTTSAPIKeyAtom,
  trialEventStatusAtom,
  predictedCaptionTextAtom,
} from "@/stores/experiment";
import {
  base64EncodedCaptureAtom,
  base64EncodedVoiceAtom,
} from "@/stores/capture";

import { jitter, delay, base64ToBlob } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import { channels } from "@constants";

// Goal: generate an image caption text (and TTS voice) from the captured image via external APIs
export function CrossFixationBeforeMultimodal() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);
  const azureAPIUrl = useAtomValue(azureAPIUrlAtom);
  const azureAPIKey = useAtomValue(azureAPIKeyAtom);
  const googleTTSAPIKey = useAtomValue(googleTTSAPIKeyAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);

  const base64EncodedCapture = useAtomValue(base64EncodedCaptureAtom);

  const setPredictedCaptionText = useSetAtom(predictedCaptionTextAtom);
  const setBase64EncodedVoice = useSetAtom(base64EncodedVoiceAtom);

  const setTrialEventStatus = useSetAtom(trialEventStatusAtom);

  const fixationDurationInMs = trialInfo?.fixationDurationInMs ?? 5000;
  const jitterRatio = trialInfo?.fixationJitterRatio ?? 0.2;
  const probabilityOfCaptionText = trialInfo?.propabilityOfCaptionText ?? 0.5;
  const speakingRate = trialInfo?.speakingRate ?? 1.2;

  useEffect(() => {
    const generateCaptionAndOptionalVoice = async () => {
      const blobImage = await base64ToBlob(
        `data:image/png;base64,${base64EncodedCapture}`,
      );
      if (!azureAPIUrl || !azureAPIKey) {
        throw "AzureAPIUrl and AzureAPIKey not set.";
      }
      const azureCVResponse = await fetch(azureAPIUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Ocp-Apim-Subscription-Key": azureAPIKey,
        },
        body: blobImage,
      });
      const azureCVResponseJson = await azureCVResponse.json();
      console.log(azureCVResponseJson);
      const allDescriptions = azureCVResponseJson.description;
      const firstCaption = allDescriptions.captions[0];
      setPredictedCaptionText(firstCaption);

      if (Math.random() >= probabilityOfCaptionText) {
        const googleTTSResponse = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleTTSAPIKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: {
                text: firstCaption.text,
              },
              voice: {
                languageCode: "en-US",
              },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate,
              },
            }),
          },
        );
        const googleTTSEncodedData = (await googleTTSResponse.json())
          .audioContent;
        setBase64EncodedVoice(`data:audio/mp3;base64,${googleTTSEncodedData}`);

        const soundStoreResponse = await window.api.invoke(
          channels.STREET.STORE_SOUND,
          googleTTSEncodedData,
          dataDirPaths.runCaptionAudioDirPath,
          `trial_${currentTrialNumber}`,
        );
        reportAPIResponse(soundStoreResponse);
      } else {
        setBase64EncodedVoice("");
        console.log("[CrossFixationBeforeMultimodal] Caption-only trial");
      }
    };

    const init = async () => {
      const jitteredFixationCaptureDurationInMs = jitter(
        fixationDurationInMs,
        jitterRatio,
      );

      await Promise.all([
        window.api
          .invoke(
            channels.WRITE_ETIME,
            dataDirPaths.participantRunDataDirPath,
            "trial_fixation",
          )
          .then((etimeResponse) => reportAPIResponse(etimeResponse)),
        generateCaptionAndOptionalVoice(),
        delay(jitteredFixationCaptureDurationInMs),
      ]);

      setTrialEventStatus("multimodal");
    };

    init();
  }, [
    azureAPIKey,
    azureAPIUrl,
    base64EncodedCapture,
    currentTrialNumber,
    dataDirPaths.participantRunDataDirPath,
    dataDirPaths.runCaptionAudioDirPath,
    fixationDurationInMs,
    googleTTSAPIKey,
    jitterRatio,
    probabilityOfCaptionText,
    setBase64EncodedVoice,
    setPredictedCaptionText,
    setTrialEventStatus,
    speakingRate,
  ]);
  return (
    <div className="flex items-center text-white max-w-lg">
      <p className="font-bold text-5xl">+</p>
    </div>
  );
}
