import { atom } from "jotai";

export const streetViewRefAtom = atom<
  google.maps.StreetViewPanorama | undefined
>(undefined);

export const mapDivRefAtom = atom<HTMLDivElement | undefined>(undefined);
