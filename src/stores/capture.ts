import { atom } from "jotai";

export const captureTimerEnabledAtom = atom(false);

export const capturedVisibleAtom = atom(false);


// New

export const captureIntervalEnableAtom = atom(false);
export const capturePageLoadAtom = atom(false);
export const enableControllerActionAtom = atom(false);
export const base64EncodedCaptureAtom = atom("");
export const base64EncodedVoiceAtom = atom("");