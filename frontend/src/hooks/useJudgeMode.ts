import { useEffect } from "react";
import { useUIStore } from "../store/uiStore";

export function useJudgeMode() {
  const { isJudgeMode, toggleJudgeMode } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on 'J' or 'j' when not focused on an input/textarea
      if (
        (e.key === "j" || e.key === "J") &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        toggleJudgeMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleJudgeMode]);

  return { isJudgeMode, toggleJudgeMode };
}
