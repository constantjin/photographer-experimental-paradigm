import { useEffect } from "react";
import { useSetAtom, useAtomValue } from "jotai";

import {
  dataDirPathsAtom,
  trialInfoAtom,
  trialEventStatusAtom,
  predictedCaptionTextAtom,
} from "@/stores/experiment";
import { base64EncodedVoiceAtom } from "@/stores/capture";

import { delay } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import { channels } from "@constants";

// Goal: present either text or voice of the generated caption text
export function Multimodal() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);

  const setTrialEventStatus = useSetAtom(trialEventStatusAtom);

  const predictedCaptionText = useAtomValue(predictedCaptionTextAtom);
  const base64EncodedVoice = useAtomValue(base64EncodedVoiceAtom);
  const isCaptionModality = base64EncodedVoice === "";

  const multimodalDurationInMs = trialInfo?.multimodalDurationInMs ?? 2000;

  const asyncPlayAudio = (audio: HTMLAudioElement) => {
    return new Promise((res) => {
      audio.play();
      audio.onended = res;
    });
  };

  useEffect(() => {
    const playAudioWhenNotCaption = async () => {
      if (!isCaptionModality) {
        const audio = new Audio(base64EncodedVoice);
        await asyncPlayAudio(audio);
      }
    };

    const init = async () => {
      await Promise.all([
        window.api
          .invoke(
            channels.WRITE_ETIME,
            dataDirPaths.participantRunDataDirPath,
            `trial_${isCaptionModality ? "caption" : "voice"}:${
              predictedCaptionText.text
            }/conf:${predictedCaptionText.confidence}`,
          )
          .then((etimeResponse) => reportAPIResponse(etimeResponse)),
        playAudioWhenNotCaption(),
        delay(multimodalDurationInMs),
      ]);

      setTrialEventStatus("fixation_before_reward");
    };

    init();
  }, [
    base64EncodedVoice,
    dataDirPaths.participantRunDataDirPath,
    isCaptionModality,
    multimodalDurationInMs,
    predictedCaptionText.confidence,
    predictedCaptionText.text,
    setTrialEventStatus,
  ]);
  return (
    <div className="flex items-center text-center text-white max-w-lg">
      {isCaptionModality ? (
        <p className="text-3xl break-words">{predictedCaptionText.text}</p>
      ) : (
        <p className="font-bold text-5xl">🔈</p>
      )}
    </div>
  );
}
