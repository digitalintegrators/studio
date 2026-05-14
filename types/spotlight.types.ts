export type SpotlightFragmentShape = "rounded" | "rectangle" | "circle";

export interface SpotlightFragment {
  id: string;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: SpotlightFragmentShape;
  intensity: number;
  blur: number;
  radius: number;
  label?: string;
}

export const DEFAULT_SPOTLIGHT_DURATION = 2;

export const DEFAULT_SPOTLIGHT_FRAGMENT: Omit<SpotlightFragment, "id" | "startTime" | "endTime"> = {
  x: 50,
  y: 50,
  width: 28,
  height: 16,
  shape: "rounded",
  intensity: 0.72,
  blur: 0,
  radius: 18,
  label: "Spotlight",
};

export function createSpotlightFragment(startTime: number, duration = DEFAULT_SPOTLIGHT_DURATION): SpotlightFragment {
  return {
    id: `spotlight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    startTime,
    endTime: startTime + duration,
    ...DEFAULT_SPOTLIGHT_FRAGMENT,
  };
}
