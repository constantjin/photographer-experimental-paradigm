import { atom } from "jotai";
import { focusAtom } from "jotai/optics";

interface IRunInfo {
  city: string;
  latlng: {
    lat: number;
    lng: number;
  };
  captionTarget: string;
}

interface ITrialInfo {
  captureIntervalInMs: number;
  totalNumberOfTrials: number;
  fixationDurationInMs: number;
  fixationJitterRatio: number;
  capturePreviewDurationInMs: number;
  multimodalDurationInMs: number;
  speakingRate: number;
  propabilityOfCaptionText: number;
  rewardDurationInMs: number;
  minSimilarityThreshold: number;
  maxSimilarityThreshold: number;
}

interface IExperimentalSetting {
  googleMapsAPIKey: string;
  clipTextModelPath: string;
  clipImageModelPath: string;
  experimentalDataStorePath: string;
  azureAPIUrl: string;
  azureAPIKey: string;
  googleTTSAPIKey: string;
  runInfo: IRunInfo[];
  trialInfo: ITrialInfo;
}

export const experimentalSettingAtom = atom<IExperimentalSetting | undefined>(
  undefined,
);

export const googleMapsAPIKeyAtom = focusAtom(
  experimentalSettingAtom,
  (optic) => optic.optional().prop("googleMapsAPIKey"),
);

export const azureAPIUrlAtom = focusAtom(experimentalSettingAtom, (optic) =>
  optic.optional().prop("azureAPIUrl"),
);

export const azureAPIKeyAtom = focusAtom(experimentalSettingAtom, (optic) =>
  optic.optional().prop("azureAPIKey"),
);

export const googleTTSAPIKeyAtom = focusAtom(experimentalSettingAtom, (optic) =>
  optic.optional().prop("googleTTSAPIKey"),
);

export const trialInfoAtom = focusAtom(experimentalSettingAtom, (optic) =>
  optic.optional().prop("trialInfo"),
);

export const dataDirPathsAtom = atom({
  participantRunDataDirPath: "",
  runCaptureDirPath: "",
  runFeatureVectorDirPath: "",
  runCaptionAudioDirPath: "",
});

export const currentRunInfoAtom = atom<IRunInfo | undefined>(undefined);
export const currentTrialNumberAtom = atom(0);
