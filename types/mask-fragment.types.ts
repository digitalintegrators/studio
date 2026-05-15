export type EditableMaskShape = "rounded" | "rectangle" | "circle";

export type EditableMaskPreset = "blur" | "pixelate" | "dim" | "highlight";

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
  preset?: EditableMaskPreset;
  /** Oscurecimiento/overlay o fuerza visual del preset. 0..0.95 */
  opacity: number;
  /** Blur aplicado dentro de la región de máscara. */
  blur: number;
  /** Suavizado de borde visual. */
  feather?: number;
  /** Intensidad de pixelado para el preset pixelate. */
  pixelSize?: number;
};

export const DEFAULT_MASK_FRAGMENT_DURATION = 2;

export const MASK_PRESET_LABELS: Record<EditableMaskPreset, string> = {
  blur: "Blur",
  pixelate: "Pixelado",
  dim: "Oscurecer",
  highlight: "Resaltar",
};

export const MASK_PRESET_DEFAULTS: Record<
  EditableMaskPreset,
  Pick<EditableMaskFragment, "preset" | "opacity" | "blur" | "feather" | "pixelSize" | "label">
> = {
  blur: {
    preset: "blur",
    label: "Blur",
    opacity: 0.38,
    blur: 14,
    feather: 18,
    pixelSize: 10,
  },
  pixelate: {
    preset: "pixelate",
    label: "Pixelado",
    opacity: 0.36,
    blur: 0,
    feather: 10,
    pixelSize: 14,
  },
  dim: {
    preset: "dim",
    label: "Oscurecer",
    opacity: 0.58,
    blur: 0,
    feather: 12,
    pixelSize: 10,
  },
  highlight: {
    preset: "highlight",
    label: "Resaltar",
    opacity: 0.42,
    blur: 3,
    feather: 22,
    pixelSize: 8,
  },
};

export function applyMaskPresetDefaults(
  fragment: EditableMaskFragment,
  preset: EditableMaskPreset
): EditableMaskFragment {
  return {
    ...fragment,
    ...MASK_PRESET_DEFAULTS[preset],
    preset,
  };
}

export function createEditableMaskFragment(
  startTime: number,
  duration: number = DEFAULT_MASK_FRAGMENT_DURATION,
  preset: EditableMaskPreset = "blur"
): EditableMaskFragment {
  const defaults = MASK_PRESET_DEFAULTS[preset];

  return {
    id: `mask-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    startTime,
    endTime: startTime + duration,
    label: defaults.label ?? "Máscara",
    x: 50,
    y: 50,
    width: 28,
    height: 18,
    shape: "rounded",
    radius: 18,
    opacity: defaults.opacity,
    blur: defaults.blur,
    feather: defaults.feather,
    pixelSize: defaults.pixelSize,
    preset,
  };
}
