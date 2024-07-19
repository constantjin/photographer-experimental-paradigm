export const channels: any;

export const RunInfoSchema: any;
export const TrialInfoSchema: any;
export const ExperimentalSettingSchema: any;

// I do not know why, but the electron build fails if we exclude `any` type annotations
// of constants from `constants.ts` in this constants.d.ts file.
// Therefore, please update this declaration file after modifying `constants.ts` file.
