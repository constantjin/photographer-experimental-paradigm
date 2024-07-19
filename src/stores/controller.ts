import { atom } from "jotai";
import { focusAtom } from "jotai/optics";

interface IControllerState {
  enabled: boolean;
  action: "stop" | "up" | "down" | "left" | "right" | "capture";
}

export const controllerStateAtom = atom<IControllerState>({
  enabled: false,
  action: "stop",
});

export const controllerEnabledAtom = focusAtom(controllerStateAtom, (optic) =>
  optic.prop("enabled"),
);
export const controllerActionAtom = focusAtom(controllerStateAtom, (optic) =>
  optic.prop("action"),
);
