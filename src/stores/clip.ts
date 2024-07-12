import { atom } from "jotai";

export const clipTextFeatureAtom = atom<Float32Array | undefined>(undefined);
export const clipImageFeatureAtom = atom<Float32Array | undefined>(undefined);