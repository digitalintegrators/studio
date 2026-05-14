export type EditableMaskShape = "rounded" | "rectangle" | "circle";

export type EditableMaskFragment = {
  id: string;
  startTime: number;
  endTime: number;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: EditableMaskShape;
  radius?: number;
  opacity: number;
  blur: number;
};

export const DEFAULT_MASK_FRAGMENT_DURATION = 2;

export function createEditableMaskFragment(
  startTime: number,
  duration: number = DEFAULT_MASK_FRAGMENT_DURATION
): EditableMaskFragment {
  return {
    id: `mask-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    startTime,
    endTime: startTime + duration,
    label: "Máscara",
    x: 50,
    y: 50,
    width: 28,
    height: 18,
    shape: "rounded",
    radius: 18,
    opacity: 0.72,
    blur: 8,
  };
}
