import { useGamepads } from "@/utils/awesome-react-gamepads";
import { useUpdateAtom } from "jotai/utils";

import { controllerActionAtom } from "@/stores/controller";

export function GamepadInterface() {
  const setControllerAction = useUpdateAtom(controllerActionAtom);

  useGamepads({
    stickThreshold: 0.4,
    onGamepadAxesChange(axes) {
      const currAxesState = axes;
      // console.log(currAxesState.axesName);
      switch (currAxesState.axesName) {
        case "LeftStickY":
          // if (currAxesState.value === 0) {
          //   setControllerAction("stop");
          // } else if (currAxesState.value === -0.7) {
          //   setControllerAction("down");
          // } else if (currAxesState.value === 0.7) {
          //   setControllerAction("up");
          // }
          // break;
          if (currAxesState.value === 0) {
            setControllerAction("stop");
          } else if (currAxesState.value < -0.5) {
            setControllerAction("down");
          } else if (currAxesState.value > 0.5) {
            setControllerAction("up");
          }
          break;

        case "LeftStickX":
          // if (currAxesState.value === 0) {
          //   setControllerAction("stop");
          // } else if (currAxesState.value === -0.7) {
          //   setControllerAction("left");
          // } else if (currAxesState.value === 0.4) {
          //   setControllerAction("right");
          // }
          // break;
          if (currAxesState.value === 0) {
            setControllerAction("stop");
          } else if (currAxesState.value < -0.4) {
            setControllerAction("left");
          } else if (currAxesState.value > 0.4) {
            setControllerAction("right");
          }
          break;
      }
    },
    onGamepadButtonDown(button) {
      if (button.buttonIndex === 0) {
        setControllerAction("capture");
      }
    },
    onGamepadButtonUp(button) {
      if (button.buttonIndex === 0) {
        setControllerAction("stop");
      }
    },
  });

  return <div></div>;
}
