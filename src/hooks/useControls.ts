import { useEffect, useState } from "react";

export type Controls = {
  throttleUp: boolean;
  throttleDown: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  pitchUp: boolean;
  pitchDown: boolean;
  yawLeft: boolean;
  yawRight: boolean;
  fireMG: boolean;
  fireMissile: boolean;
  fireFlare: boolean;
  mouseX: number;
  mouseY: number;
};

export function useControls() {
  const [controls, setControls] = useState<Controls>({
    throttleUp: false,
    throttleDown: false,
    rollLeft: false,
    rollRight: false,
    pitchUp: false,
    pitchDown: false,
    yawLeft: false,
    yawRight: false,
    fireMG: false,
    fireMissile: false,
    fireFlare: false,
    mouseX: 0,
    mouseY: 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "w": setControls((c) => ({ ...c, throttleUp: true })); break;
        case "s": setControls((c) => ({ ...c, throttleDown: true })); break;
        case "a": setControls((c) => ({ ...c, rollLeft: true })); break;
        case "d": setControls((c) => ({ ...c, rollRight: true })); break;
        case "arrowup": setControls((c) => ({ ...c, pitchUp: true })); break;
        case "arrowdown": setControls((c) => ({ ...c, pitchDown: true })); break;
        case "q": setControls((c) => ({ ...c, yawLeft: true })); break;
        case "e": setControls((c) => ({ ...c, yawRight: true })); break;
        case " ": setControls((c) => ({ ...c, fireMG: true })); break;
        case "r": setControls((c) => ({ ...c, fireMissile: true })); break;
        case "f": setControls((c) => ({ ...c, fireFlare: true })); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "w": setControls((c) => ({ ...c, throttleUp: false })); break;
        case "s": setControls((c) => ({ ...c, throttleDown: false })); break;
        case "a": setControls((c) => ({ ...c, rollLeft: false })); break;
        case "d": setControls((c) => ({ ...c, rollRight: false })); break;
        case "arrowup": setControls((c) => ({ ...c, pitchUp: false })); break;
        case "arrowdown": setControls((c) => ({ ...c, pitchDown: false })); break;
        case "q": setControls((c) => ({ ...c, yawLeft: false })); break;
        case "e": setControls((c) => ({ ...c, yawRight: false })); break;
        case " ": setControls((c) => ({ ...c, fireMG: false })); break;
        case "r": setControls((c) => ({ ...c, fireMissile: false })); break;
        case "f": setControls((c) => ({ ...c, fireFlare: false })); break;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates (-1 to 1)
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setControls((c) => ({ ...c, mouseX: x, mouseY: y }));
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) setControls((c) => ({ ...c, fireMG: true }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) setControls((c) => ({ ...c, fireMG: false }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return controls;
}
