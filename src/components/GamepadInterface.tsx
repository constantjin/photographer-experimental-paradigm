import { useGamepads } from "@/utils/awesome-react-gamepads";
import { useUpdateAtom } from "jotai/utils";

import { controllerActionAtom } from "@/stores/controller";

export function GamepadInterface() {
  const setControllerAction = useUpdateAtom(controllerActionAtom);

  // Note: the Current Designs Tethyx joystick assigns the analogue stick as 'LeftStick (axis 0)'
  // and the thumb button as 'Button 0' ('A' button from the Microsoft Xbox game pad).
  // Please visit https://hardwaretester.com/gamepad to check axis/stick names and adjust
  // thresholds if you use a gamepad/joystick other than Tethyx.

  useGamepads({
    stickThreshold: 0.4,
    onGamepadAxesChange(axes) {
      const currAxesState = axes;
      switch (currAxesState.axesName) {
        case "LeftStickY":
          if (currAxesState.value === 0) {
            setControllerAction("stop");
          } else if (currAxesState.value < -0.5) {
            setControllerAction("down");
          } else if (currAxesState.value > 0.5) {
            setControllerAction("up");
          }
          break;

        case "LeftStickX":
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
