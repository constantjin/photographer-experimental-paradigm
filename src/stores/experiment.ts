import { atom } from "jotai";
import { focusAtom } from "jotai/optics";
import type { z } from "zod";

import type { RunInfoSchema, ExperimentalSettingSchema } from "@constants";

type RunInfo = z.infer<typeof RunInfoSchema>;
type ExperimentalSetting = z.infer<typeof ExperimentalSettingSchema>;

export const experimentalSettingAtom = atom<ExperimentalSetting | undefined>(
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

export const currentRunInfoAtom = atom<RunInfo | undefined>(undefined);
export const currentTrialNumberAtom = atom(0);

export type TrialEvent =
  | "fixation_before_preview"
  | "capture_preview"
  | "fixation_before_multimodal"
  | "multimodal"
  | "fixation_before_reward"
  | "reward"
  | "fixation_after_reward";
export const trialEventStatusAtom = atom<TrialEvent | undefined>(undefined);

export const predictedCaptionTextAtom = atom({ text: "", confidence: 0.0 });
