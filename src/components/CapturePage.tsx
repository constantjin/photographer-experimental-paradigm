import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSetAtom, useAtomValue, atom, useAtom } from "jotai";

import {
  dataDirPathsAtom,
  trialInfoAtom,
  currentTrialNumberAtom,
  azureAPIUrlAtom,
  azureAPIKeyAtom,
  googleTTSAPIKeyAtom,
} from "@/stores/experiment";
import { controllerEnabledAtom } from "@/stores/controller";
import {
  captureIntervalEnableAtom,
  capturePageLoadAtom,
  // enableControllerActionAtom,
  base64EncodedCaptureAtom,
  base64EncodedVoiceAtom,
} from "@/stores/capture";
import { clipImageFeatureAtom, clipTextFeatureAtom } from "@/stores/clip";

import {
  jitter,
  delay,
  noramlizeImageBuffer,
  cosineSimilarity,
  base64ToBlob,
} from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import { channels } from "@constants";

// function CrossFixation() {
//     return (
//         <div className="flex items-center text-white max-w-lg">
//           <p className="font-bold text-5xl">+</p>
//         </div>
//     )
// }

// Trial Order
// const onCrossFixationBeforeCaptureAtom = atom(false);
// const onCapturePreviewAtom = atom(false)
// // const onCrossFixationAfterCaptureAtom = atom(false);

// const onCrossFixationAfterRewardAtom = atom(false);

type TrialOrder =
  | "fixation_before_preview"
  | "capture_preview"
  | "fixation_before_multimodal"
  | "multimodal"
  | "fixation_before_reward"
  | "reward"
  | "fixation_after_reward";
const trialOrderStatusAtom = atom<TrialOrder | undefined>(undefined);

// Page specific constant (should be moved into the setting file)
// const totalNumberofTrials = 10;
// const probabilityOfCaptionText = 0.5;

// For captionText
const predictedCaptionTextAtom = atom({ text: "", confidence: 0.0 });

function CrossFixationBeforePreview() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);
  const base64EncodedCapture = useAtomValue(base64EncodedCaptureAtom);
  const trialInfo = useAtomValue(trialInfoAtom);

  // const setOnCrossFixationBeforeCapture = useSetAtom(onCrossFixationBeforeCaptureAtom);
  // const setOnCapturePreview = useSetAtom(onCapturePreviewAtom);
  const setTrialOrderStatus = useSetAtom(trialOrderStatusAtom);

  // Page-specific constants
  //   const fixationDurationInMs = 5000; // ms
  //   const jitterRatio = 0.2;
  const fixationDurationInMs = trialInfo?.fixationDurationInMs ?? 5000;
  const jitterRatio = trialInfo?.fixationJitterRatio ?? 0.2;

  useEffect(() => {
    const init = async () => {
      const uploadStart = performance.now();
      const etimeResponse = await window.api.invoke(
        channels.WRITE_ETIME,
        dataDirPaths.participantRunDataDirPath,
        "trial_fixation",
      );
      reportAPIResponse(etimeResponse);

      const imageStoreResponse = await window.api.invoke(
        channels.STREET.STORE_CAPTURE,
        base64EncodedCapture,
        dataDirPaths.runCaptureDirPath,
        `trial_${currentTrialNumber}`,
      );
      reportAPIResponse(imageStoreResponse);
      const uploadEnd = performance.now();

      const jitteredFixationCaptureDurationInMs = jitter(
        fixationDurationInMs,
        jitterRatio,
      );
      const uploadDelay = uploadEnd - uploadStart;
      if (jitteredFixationCaptureDurationInMs > uploadDelay) {
        await delay(jitteredFixationCaptureDurationInMs - uploadDelay);
      }

      // setOnCrossFixationBeforeCapture(false);
      setTrialOrderStatus("capture_preview");
    };
    init();

    return () => {
      // console.log("Destroy: Cross Fixation Before")
      // setOnCapturePreview(true);
    };
  }, []);

  return (
    <div className="flex items-center text-white max-w-lg">
      <p className="font-bold text-5xl">+</p>
    </div>
  );
}

function CapturePreview() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);
  const base64EncodedCapture = useAtomValue(base64EncodedCaptureAtom);

  // const setOnCapturePreview = useSetAtom(onCapturePreviewAtom);
  // const setOnCrossFixationAfterReward = useSetAtom(onCrossFixationAfterRewardAtom);
  const setTrialOrderStatus = useSetAtom(trialOrderStatusAtom);
  const setClipImageFeature = useSetAtom(clipImageFeatureAtom);

  // Page-specific constants
  //   const fixationDurationInMs = 2000; // ms
  const fixationDurationInMs = trialInfo?.capturePreviewDurationInMs ?? 2000;

  useEffect(() => {
    const init = async () => {
      const etimeStart = performance.now();
      const etimeResponse = await window.api.invoke(
        channels.WRITE_ETIME,
        dataDirPaths.participantRunDataDirPath,
        "trial_preview",
      );
      reportAPIResponse(etimeResponse);

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
      const etimeEnd = performance.now();

      const etimeDelay = etimeEnd - etimeStart;
      if (fixationDurationInMs > etimeDelay) {
        await delay(fixationDurationInMs - etimeDelay);
      }

      // Unload the CapturePage
      // setOnCapturePreview(false);
      setTrialOrderStatus("fixation_before_multimodal");
    };
    init();

    return () => {
      // console.log("Destroy: Capture Preview")
      // setOnCrossFixationAfterReward(true);
    };
  }, []);

  return (
    <div>
      <img src={`data:image/png;base64,${base64EncodedCapture}`} />
    </div>
  );
}

function CrossFixationBeforeMultimodal() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);
  const azureAPIUrl = useAtomValue(azureAPIUrlAtom);
  const azureAPIKey = useAtomValue(azureAPIKeyAtom);
  const googleTTSAPIKey = useAtomValue(googleTTSAPIKeyAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);

  const base64EncodedCapture = useAtomValue(base64EncodedCaptureAtom);
  const setPredictedCaptionText = useSetAtom(predictedCaptionTextAtom);
  const setBase64EncodedVoice = useSetAtom(base64EncodedVoiceAtom);

  // Page-specific constants
  //   const fixationDurationInMs = 5000; // ms
  //   const jitterRatio = 0.2;
  const fixationDurationInMs = trialInfo?.fixationDurationInMs ?? 5000;
  const jitterRatio = trialInfo?.fixationJitterRatio ?? 0.2;
  const probabilityOfCaptionText = trialInfo?.propabilityOfCaptionText ?? 0.5;
  const speakingRate = trialInfo?.speakingRate ?? 1.2;

  const setTrialOrderStatus = useSetAtom(trialOrderStatusAtom);

  useEffect(() => {
    const init = async () => {
      const etimeStart = performance.now();
      const etimeResponse = await window.api.invoke(
        channels.WRITE_ETIME,
        dataDirPaths.participantRunDataDirPath,
        "trial_fixation",
      );
      reportAPIResponse(etimeResponse);

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
        // console.log(googleTTSEncodedData);
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
        console.log("Show only caption");
      }

      const etimeEnd = performance.now();

      const jitteredFixationCaptureDurationInMs = jitter(
        fixationDurationInMs,
        jitterRatio,
      );
      const etimeDelay = etimeEnd - etimeStart;
      if (jitteredFixationCaptureDurationInMs > etimeDelay) {
        await delay(jitteredFixationCaptureDurationInMs - etimeDelay);
      }

      setTrialOrderStatus("multimodal");
    };

    init();

    return () => {
      // console.log("Destroy: Cross Fixation After")
    };
  }, []);
  return (
    <div className="flex items-center text-white max-w-lg">
      <p className="font-bold text-5xl">+</p>
    </div>
  );
}

function Multimodal() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);

  // Page-specific constants
  //   const durationInMs = 2000; // ms
  const durationInMs = trialInfo?.multimodalDurationInMs ?? 2000;

  const predictedCaptionText = useAtomValue(predictedCaptionTextAtom);
  const base64EncodedVoice = useAtomValue(base64EncodedVoiceAtom);

  const setTrialOrderStatus = useSetAtom(trialOrderStatusAtom);
  const isTextModality = base64EncodedVoice === "";

  const asyncPlayAudio = (audio: HTMLAudioElement) => {
    return new Promise((res) => {
      audio.play();
      audio.onended = res;
    });
  };

  useEffect(() => {
    const init = async () => {
      const etimeStart = performance.now();
      const etimeResponse = await window.api.invoke(
        channels.WRITE_ETIME,
        dataDirPaths.participantRunDataDirPath,
        `trial_${isTextModality ? "caption" : "voice"}:${
          predictedCaptionText.text
        }/conf:${predictedCaptionText.confidence}`,
      );
      reportAPIResponse(etimeResponse);

      if (!isTextModality) {
        const audio = new Audio(base64EncodedVoice);
        await asyncPlayAudio(audio);
      }

      const etimeEnd = performance.now();

      const etimeDelay = etimeEnd - etimeStart;
      if (durationInMs > etimeDelay) {
        await delay(durationInMs - etimeDelay);
      }

      setTrialOrderStatus("fixation_before_reward");
    };

    init();

    return () => {
      // console.log("Destroy: Cross Fixation After")
    };
  }, []);
  return (
    // <div className="flex items-center text-white max-w-lg">
    //   <p className="font-bold text-5xl">${rewardScore}</p>

    // </div>
    <div className="flex items-center text-center text-white max-w-lg">
      {isTextModality ? (
        <p className="text-3xl break-words">{predictedCaptionText.text}</p>
      ) : (
        <p className="font-bold text-5xl">🔈</p>
      )}
    </div>
  );
}

function CrossFixationBeforeReward() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);

  // Page-specific constants
  //   const fixationDurationInMs = 5000; // ms
  //   const jitterRatio = 0.2;
  const fixationDurationInMs = trialInfo?.fixationDurationInMs ?? 5000;
  const jitterRatio = trialInfo?.fixationJitterRatio ?? 0.2;

  const setTrialOrderStatus = useSetAtom(trialOrderStatusAtom);

  useEffect(() => {
    const init = async () => {
      const etimeStart = performance.now();
      const etimeResponse = await window.api.invoke(
        channels.WRITE_ETIME,
        dataDirPaths.participantRunDataDirPath,
        "trial_fixation",
      );
      reportAPIResponse(etimeResponse);
      const etimeEnd = performance.now();

      const jitteredFixationCaptureDurationInMs = jitter(
        fixationDurationInMs,
        jitterRatio,
      );
      const etimeDelay = etimeEnd - etimeStart;
      if (jitteredFixationCaptureDurationInMs > etimeDelay) {
        await delay(jitteredFixationCaptureDurationInMs - etimeDelay);
      }

      setTrialOrderStatus("reward");
    };

    init();

    return () => {
      // console.log("Destroy: Cross Fixation After")
    };
  }, []);
  return (
    <div className="flex items-center text-white max-w-lg">
      <p className="font-bold text-5xl">+</p>
    </div>
  );
}

function Reward() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);

  // Page-specific constants
  //   const durationInMs = 2000; // ms
  //   const minSimilarity = 0.18;
  //   const maxSimilarity = 0.28;
  const durationInMs = trialInfo?.rewardDurationInMs ?? 2000;
  const minSimilarity = trialInfo?.minSimilarityThreshold ?? 0.18;
  const maxSimilarity = trialInfo?.maxSimilarityThreshold ?? 0.28;

  const clipTextFeature = useAtomValue(clipTextFeatureAtom);
  const clipImageFeature = useAtomValue(clipImageFeatureAtom);
  const [rewardScore, setRewardScore] = useState(0.0);

  const setTrialOrderStatus = useSetAtom(trialOrderStatusAtom);

  useEffect(() => {
    const init = async () => {
      let similarity = 0.0;
      let scorePercentage = 0.0;
      if (!clipTextFeature || !clipImageFeature) {
        similarity = 0.0;
      } else {
        similarity = cosineSimilarity(clipImageFeature, clipTextFeature);
        if (similarity < minSimilarity) {
          setRewardScore(0.0);
        } else if (similarity > maxSimilarity) {
          setRewardScore(100.0);
        } else {
          scorePercentage =
            ((similarity - minSimilarity) / (maxSimilarity - minSimilarity)) *
            100;
          setRewardScore(scorePercentage);
        }
      }
      const etimeStart = performance.now();
      const etimeResponse = await window.api.invoke(
        channels.WRITE_ETIME,
        dataDirPaths.participantRunDataDirPath,
        `trial_reward:${similarity}/percent:${scorePercentage}`,
      );
      reportAPIResponse(etimeResponse);
      const etimeEnd = performance.now();

      const etimeDelay = etimeEnd - etimeStart;
      if (durationInMs > etimeDelay) {
        await delay(durationInMs - etimeDelay);
      }

      setTrialOrderStatus("fixation_after_reward");
    };

    init();

    return () => {
      // console.log("Destroy: Cross Fixation After")
    };
  }, []);
  return (
    // <div className="flex items-center text-white max-w-lg">
    //   <p className="font-bold text-5xl">${rewardScore}</p>

    // </div>
    <div className="flex items-center flex-col w-full">
      <div className="h-3 relative w-1/2 rounded-full overflow-hidden">
        <div className="w-full h-full bg-gray-200 absolute"></div>
        <div
          className="h-full bg-yellow-500 absolute"
          style={{ width: `${rewardScore}%` }}
        ></div>
      </div>
      <div className="w-1/2 flex flex-row justify-between mt-2">
        <span className="text-white text-2xl">Min</span>
        <span className="text-white text-2xl">Max</span>
      </div>
    </div>
  );
}

function CrossFixationAfterReward() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);
  const setCurrentTrialNumber = useSetAtom(currentTrialNumberAtom);

  const setCapturePageLoad = useSetAtom(capturePageLoadAtom);

  const navigate = useNavigate();

  // Page-specific constants
  //   const fixationDurationInMs = 5000; // ms
  //   const jitterRatio = 0.2;
  const fixationDurationInMs = trialInfo?.fixationDurationInMs ?? 5000;
  const jitterRatio = trialInfo?.fixationJitterRatio ?? 0.2;
  const totalNumberOfTrials = trialInfo?.totalNumberOfTrials ?? 10;

  useEffect(() => {
    const init = async () => {
      console.log("Load: Cross Fixation After");
      const etimeStart = performance.now();
      let etimeResponse = await window.api.invoke(
        channels.WRITE_ETIME,
        dataDirPaths.participantRunDataDirPath,
        "trial_fixation",
      );
      reportAPIResponse(etimeResponse);
      const etimeEnd = performance.now();

      const jitteredFixationCaptureDurationInMs = jitter(
        fixationDurationInMs,
        jitterRatio,
      );
      const etimeDelay = etimeEnd - etimeStart;
      if (jitteredFixationCaptureDurationInMs > etimeDelay) {
        await delay(jitteredFixationCaptureDurationInMs - etimeDelay);
      }

      const newTrialNumber = currentTrialNumber + 1;
      if (newTrialNumber > totalNumberOfTrials) {
        navigate("/end");
      } else {
        setCurrentTrialNumber(newTrialNumber);
        etimeResponse = await window.api.invoke(
          channels.WRITE_ETIME,
          dataDirPaths.participantRunDataDirPath,
          `trial_${newTrialNumber}`,
        );
        reportAPIResponse(etimeResponse);

        const actionResponse = await window.api.invoke(
          channels.STREET.WRITE_ACTION,
          dataDirPaths.participantRunDataDirPath,
          `trial_${newTrialNumber}`,
        );
        reportAPIResponse(actionResponse);

        // Unload the CapturePage
        setCapturePageLoad(false);
      }
    };

    init();

    return () => {
      console.log("Destroy: Cross Fixation After");
    };
  }, []);
  return (
    <div className="flex items-center text-white max-w-lg">
      <p className="font-bold text-5xl">+</p>
    </div>
  );
}

export function CapturePage() {
  // // Page-specific constants
  // const fixationCaptureDurationInMs = 2000; // ms
  // const jitterRatio = 0.2;

  // const dataDirPaths = useAtomValue(dataDirPathsAtom);

  // const setEnableControllerAction = useSetAtom(enableControllerActionAtom);
  // const setCapturePageLoad = useSetAtom(capturePageLoadAtom);
  // const setCaptureIntervalEnable = useSetAtom(captureIntervalEnableAtom);
  // const base64EncodedCapture = useAtomValue(base64EncodedCaptureAtom);

  // const currentTrialNumber = useAtomValue(currentTrialNumberAtom);
  // const setCurrentTrialNumber = useSetAtom(currentTrialNumberAtom);

  // const runTrialSequence = useCallback(async () => {
  //     console.log("[CapturePage] loaded capture page.")
  //     setCaptureIntervalEnable(false);
  //     setEnableControllerAction(false);

  //     const imageStoreResponse = await window.api.invoke(
  //         "street:store-capture",
  //         base64EncodedCapture,
  //         dataDirPaths.runCaptureDirPath,
  //         `trial_${currentTrialNumber}`
  //         );
  //     reportAPIResponse(imageStoreResponse);

  //     const jitteredFixationCaptureDurationInMs = jitter(
  //         fixationCaptureDurationInMs,
  //         jitterRatio
  //     );
  //     await delay(jitteredFixationCaptureDurationInMs);

  //     // Increase the current trial number
  //     const newTrialNumber = currentTrialNumber + 1;
  //     setCurrentTrialNumber(newTrialNumber);
  //     const etimeResponse = await window.api.invoke(
  //         "write-etime",
  //         dataDirPaths.participantRunDataDirPath,
  //         `trial_${newTrialNumber}`
  //         );
  //     reportAPIResponse(etimeResponse);

  //     // Unload the CapturePage
  //     setCapturePageLoad(false);
  // }, [])

  // const setOnCrossFixationBeforeCapture = useSetAtom(onCrossFixationBeforeCaptureAtom);
  // // const onCrossFixationBeforeCapture = useAtomValue(onCrossFixationBeforeCaptureAtom);

  // const onCapturePreview = useAtomValue(onCapturePreviewAtom);
  // const onCrossFixationAfterReward = useAtomValue(onCrossFixationAfterRewardAtom);

  const trialOrderStatus = useAtomValue(trialOrderStatusAtom);
  const setTrialOrderStatus = useSetAtom(trialOrderStatusAtom);

  // const setEnableControllerAction = useSetAtom(enableControllerActionAtom);
  const setControllerEnabled = useSetAtom(controllerEnabledAtom);
  const setCaptureIntervalEnable = useSetAtom(captureIntervalEnableAtom);
  const currentTrialNumber = useAtomValue(currentTrialNumberAtom);

  const trialInfo = useAtomValue(trialInfoAtom);
  const totalNumberOfTrials = trialInfo?.totalNumberOfTrials ?? 10;

  const [intialized, setInitialized] = useState(false);

  const initTrialSequence = () => {
    console.log("[CapturePage] loaded capture page.");
    setCaptureIntervalEnable(false);
    // setEnableControllerAction(false);
    setControllerEnabled(false);
    setTrialOrderStatus("fixation_before_preview");
    setInitialized(true);
    // setOnCrossFixationBeforeCapture(true);
  };

  const trialComponentAssignment = {
    fixation_before_preview: <CrossFixationBeforePreview />,
    capture_preview: <CapturePreview />,
    fixation_before_multimodal: <CrossFixationBeforeMultimodal />,
    multimodal: <Multimodal />,
    fixation_before_reward: <CrossFixationBeforeReward />,
    reward: <Reward />,
    fixation_after_reward: <CrossFixationAfterReward />,
  };

  useEffect(() => {
    initTrialSequence();

    return () => {
      console.log("[CapturePage] Unloaded capture page.");
      if (currentTrialNumber > totalNumberOfTrials) {
        console.log("[CapturePage] Run end");
      } else {
        setCaptureIntervalEnable(true);
        // setEnableControllerAction(true);
        setControllerEnabled(true);
      }
    };
  }, []);

  return (
    // <CrossFixation />
    <>
      {intialized &&
        trialOrderStatus &&
        trialComponentAssignment[trialOrderStatus]}
    </>
  );
}
