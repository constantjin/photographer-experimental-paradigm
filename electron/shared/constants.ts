import { z } from "zod";

export const channels = {
  LOAD_SETTING: "load-setting",
  REGISTER_PARTICIPANT: "register-participant",
  WRITE_ETIME: "write-etime",
  CLIP: {
    LOAD_CLIP_TEXT: "clip:load-clip-text",
    LOAD_CLIP_IMAGE: "clip:load-clip-image",
    PREDICT_CLIP_TEXT: "clip:predict-clip-text",
    RESIZE_IMAGE: "clip:resize-image",
    PREDICT_CLIP_IMAGE: "clip:predict-clip-image",
  },
  STREET: {
    STORE_CAPTURE: "street:store-capture",
    STORE_SOUND: "street:store-sound",
    WRITE_ACTION: "street:write-action",
  },
};

export const RunInfoSchema = z
  .object({
    city: z.string(),
    latlng: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    captionTarget: z.string(),
  })
  .strict();

export const TrialInfoSchema = z
  .object({
    captureIntervalInMs: z.number(),
    totalNumberOfTrials: z.number(),
    fixationDurationInMs: z.number(),
    fixationJitterRatio: z.number(),
    capturePreviewDurationInMs: z.number(),
    multimodalDurationInMs: z.number(),
    speakingRate: z.number(),
    propabilityOfCaptionText: z.number(),
    rewardDurationInMs: z.number(),
    minSimilarityThreshold: z.number(),
    maxSimilarityThreshold: z.number(),
  })
  .strict();

export const ExperimentalSettingSchema = z
  .object({
    googleMapsAPIKey: z.string(),
    clipTextModelPath: z.string(),
    clipImageModelPath: z.string(),
    experimentalDataStorePath: z.string(),
    azureAPIUrl: z.string(),
    azureAPIKey: z.string(),
    googleTTSAPIKey: z.string(),
    runInfo: z.array(RunInfoSchema),
    trialInfo: TrialInfoSchema,
  })
  .strict();
