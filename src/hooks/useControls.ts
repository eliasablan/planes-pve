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
  fire: boolean;
  brake: boolean;
  selectMG: boolean;
  selectMissile: boolean;
  mouseControlEnabled: boolean;
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
    fire: false,
    brake: false,
    selectMG: false,
    selectMissile: false,
    mouseControlEnabled: true,
    mouseX: 0,
    mouseY: 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.matches("input,select,textarea,[contenteditable]")) return;
      switch (e.key.toLowerCase()) {
        case "w": setControls((c) => ({ ...c, throttleUp: true })); break;
        case "s": setControls((c) => ({ ...c, throttleDown: true })); break;
        case "a": setControls((c) => ({ ...c, rollLeft: true })); break;
        case "d": setControls((c) => ({ ...c, rollRight: true })); break;
        case "arrowup": setControls((c) => ({ ...c, pitchUp: true })); break;
        case "arrowdown": setControls((c) => ({ ...c, pitchDown: true })); break;
        case "arrowleft": setControls((c) => ({ ...c, yawLeft: true })); break;
        case "arrowright": setControls((c) => ({ ...c, yawRight: true })); break;
        case "shift": setControls((c) => ({ ...c, brake: true })); break;
        case " ": setControls((c) => ({ ...c, fire: true })); break;
        case "1": setControls((c) => ({ ...c, selectMG: true })); break;
        case "2": setControls((c) => ({ ...c, selectMissile: true })); break;
        case "o": 
          if (!e.repeat) setControls((c) => ({ ...c, mouseControlEnabled: !c.mouseControlEnabled })); 
          break;
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
        case "arrowleft": setControls((c) => ({ ...c, yawLeft: false })); break;
        case "arrowright": setControls((c) => ({ ...c, yawRight: false })); break;
        case "shift": setControls((c) => ({ ...c, brake: false })); break;
        case " ": setControls((c) => ({ ...c, fire: false })); break;
        case "1": setControls((c) => ({ ...c, selectMG: false })); break;
        case "2": setControls((c) => ({ ...c, selectMissile: false })); break;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("[data-display-controls]")) return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setControls((c) => ({ ...c, mouseX: x, mouseY: y }));
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("[data-display-controls]")) return;
      if (e.button === 0) setControls((c) => ({ ...c, fire: true }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) setControls((c) => ({ ...c, fire: false }));
    };

    const releaseInput = () => setControls(c => ({ ...c, throttleUp: false, throttleDown: false, rollLeft: false, rollRight: false, pitchUp: false, pitchDown: false, yawLeft: false, yawRight: false, fire: false, brake: false, selectMG: false, selectMissile: false }));
    window.addEventListener("blur", releaseInput);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      window.removeEventListener("blur", releaseInput);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return controls;
}
