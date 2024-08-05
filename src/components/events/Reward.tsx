import { useEffect, useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";

import {
  dataDirPathsAtom,
  trialInfoAtom,
  trialEventStatusAtom,
} from "@/stores/experiment";
import { clipImageFeatureAtom, clipTextFeatureAtom } from "@/stores/clip";

import { delay, cosineSimilarity } from "@/utils";
import { reportAPIResponse } from "@/utils/api";
import { channels } from "@constants";

// Goal: present a normalized feedback score via CLIP-Image and CLIP-Text features
export function Reward() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const trialInfo = useAtomValue(trialInfoAtom);

  const clipTextFeature = useAtomValue(clipTextFeatureAtom);
  const clipImageFeature = useAtomValue(clipImageFeatureAtom);
  const [rewardScore, setRewardScore] = useState(0.0);

  const setTrialEventStatus = useSetAtom(trialEventStatusAtom);

  const rewardDurationInMs = trialInfo?.rewardDurationInMs ?? 2000;
  const minSimilarity = trialInfo?.minSimilarityThreshold ?? 0.18;
  const maxSimilarity = trialInfo?.maxSimilarityThreshold ?? 0.28;

  useEffect(() => {
    const init = async () => {
      let similarity = 0.0;
      let scorePercentage = 0.0;
      if (!clipTextFeature || !clipImageFeature) {
        similarity = 0.0;
      } else {
        similarity = cosineSimilarity(clipImageFeature, clipTextFeature);
        if (similarity < minSimilarity) {
          scorePercentage = 0.0;
          setRewardScore(0.0);
        } else if (similarity > maxSimilarity) {
          scorePercentage = 100.0;
          setRewardScore(100.0);
        } else {
          scorePercentage =
            ((similarity - minSimilarity) / (maxSimilarity - minSimilarity)) *
            100;
          setRewardScore(scorePercentage);
        }
      }

      await Promise.all([
        window.api
          .invoke(
            channels.WRITE_ETIME,
            dataDirPaths.participantRunDataDirPath,
            `trial_reward:${similarity}/percent:${scorePercentage}`,
          )
          .then((etimeResponse) => reportAPIResponse(etimeResponse)),
        delay(rewardDurationInMs),
      ]);

      setTrialEventStatus("fixation_after_reward");
    };

    init();
  }, [
    clipImageFeature,
    clipTextFeature,
    dataDirPaths.participantRunDataDirPath,
    maxSimilarity,
    minSimilarity,
    rewardDurationInMs,
    setTrialEventStatus,
  ]);
  return (
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
