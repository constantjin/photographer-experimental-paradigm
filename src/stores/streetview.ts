import { atom } from "jotai";

type streetViewLog = {
  action: string;
  coordinate: string;
  pov: google.maps.StreetViewPov;
};

export const streetViewRefAtom = atom<
  google.maps.StreetViewPanorama | undefined
>(undefined);

export const mapDivRefAtom = atom<HTMLDivElement | undefined>(undefined);

const streetViewLogAtomConfig = atom({
  action: "",
  coordinate: "",
  pov: {},
});

export const streetViewLogAtom = atom(
  (get) => get(streetViewLogAtomConfig),
  (get, set, newLog: streetViewLog) => {
    const prevLog = get(streetViewLogAtomConfig);
    if (prevLog.action === "stop" && newLog.action === "stop") {
      return;
    } else {
      set(streetViewLogAtomConfig, newLog);
      console.log(get(streetViewLogAtomConfig));
    }
  }
);

export const capturedStateAtom = atom({
  enterCaptured: false,
  exitCaptured: true,
});
