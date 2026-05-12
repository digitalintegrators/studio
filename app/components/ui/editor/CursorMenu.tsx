"use client";

import { Icon } from "@iconify/react";
import { SliderControl } from "../SliderControl";
import { TooltipAction } from "@/components/ui/tooltip-action";
import type {
    ClickEffect,
    CursorConfig,
    CursorRecordingData,
    CursorStyle,
    SpotlightShape,
} from "@/types/cursor.types";
import { DEFAULT_CURSOR_CONFIG } from "@/types/cursor.types";
import {
    DotDefaultCursor,
    MacDefaultCursor,
    WinDefaultCursor,
} from "@/components/cursor-svg";

const PRESET_COLORS = [
    "#FFFFFF",
    "#111827",
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#06B6D4",
];

const CURSOR_STYLES: {
    id: CursorStyle;
    name: string;
    description: string;
    icon: string;
}[] = [
    {
        id: "mac",
        name: "macOS",
        description: "Cursor limpio estilo macOS",
        icon: "ph:cursor-fill",
    },
    {
        id: "windows",
        name: "Windows",
        description: "Cursor clásico de Windows",
        icon: "ph:cursor",
    },
    {
        id: "dot",
        name: "Dot",
        description: "Punto minimalista",
        icon: "ph:circle-fill",
    },
    {
        id: "outline",
        name: "Outline",
        description: "Cursor blanco con borde",
        icon: "solar:cursor-bold",
    },
    {
        id: "filled",
        name: "Filled",
        description: "Cursor sólido de alto contraste",
        icon: "solar:cursor-bold-duotone",
    },
    {
        id: "glass",
        name: "Glass",
        description: "Cursor translúcido premium",
        icon: "solar:cursor-square-bold-duotone",
    },
    {
        id: "neon",
        name: "Neon",
        description: "Cursor con brillo para demos",
        icon: "solar:cursor-bold-duotone",
    },
    {
        id: "none",
        name: "None",
        description: "Ocultar cursor",
        icon: "radix-icons:value-none",
    },
];

const CLICK_EFFECTS: {
    id: ClickEffect;
    name: string;
    icon: string;
}[] = [
    { id: "none", name: "Ninguno", icon: "mdi:cancel-circle-outline" },
    { id: "standard", name: "Estándar", icon: "ph:cursor-click-fill" },
    { id: "ripple", name: "Onda", icon: "mdi:circle-expand" },
    { id: "ring", name: "Anillos", icon: "mdi:circle-outline" },
    { id: "pulse", name: "Difusión", icon: "solar:soundwave-bold" },
    { id: "spotlight", name: "Spotlight", icon: "solar:flashlight-on-bold" },
    { id: "focus", name: "Enfoque", icon: "solar:target-bold" },
    { id: "flash", name: "Flash", icon: "solar:bolt-bold" },
];

const SPOTLIGHT_SHAPES: {
    id: SpotlightShape;
    name: string;
    icon: string;
}[] = [
    { id: "circle", name: "Circular", icon: "mdi:circle-outline" },
    { id: "rounded", name: "Suave", icon: "mdi:rounded-corner" },
    { id: "beam", name: "Beam", icon: "solar:flashlight-on-bold" },
];

interface CursorMenuProps {
    cursorConfig: CursorConfig;
    onCursorConfigChange: (config: Partial<CursorConfig>) => void;
    cursorData?: CursorRecordingData;
    isRecordedVideo?: boolean;
}

function ToggleRow({
    icon,
    label,
    description,
    checked,
    onChange,
}: {
    icon: string;
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/70">
                    <Icon icon={icon} width="18" aria-hidden="true" />
                </div>

                <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/80">
                        {label}
                    </div>
                    {description ? (
                        <div className="mt-0.5 text-xs leading-snug text-white/40">
                            {description}
                        </div>
                    ) : null}
                </div>
            </div>

            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative h-8 w-14 shrink-0 rounded-full transition-all ${
                    checked
                        ? "bg-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.35)]"
                        : "bg-white/15"
                }`}
                aria-pressed={checked}
            >
                <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-lg transition-all ${
                        checked ? "left-7" : "left-1"
                    }`}
                />
            </button>
        </div>
    );
}

export default function CursorMenu({
    cursorConfig = DEFAULT_CURSOR_CONFIG,
    onCursorConfigChange,
    cursorData,
    isRecordedVideo = false,
}: CursorMenuProps) {
    const hasCursorData = cursorData?.hasCursorData || false;
    const mergedConfig = {
        ...DEFAULT_CURSOR_CONFIG,
        ...cursorConfig,
    };

    const getCursorPreviewElement = () => {
        const size = 54;
        const color = mergedConfig.color;

        switch (mergedConfig.style) {
            case "mac":
                return (
                    <MacDefaultCursor
                        color={color === "#FFFFFF" ? "#111827" : color}
                        size={size}
                    />
                );
            case "windows":
                return (
                    <WinDefaultCursor
                        color={color === "#FFFFFF" ? "#111827" : color}
                        size={size}
                    />
                );
            case "dot":
                return <DotDefaultCursor color={color} size={size} />;
            case "outline":
                return (
                    <Icon
                        icon="solar:cursor-bold"
                        width={size}
                        className="drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
                        style={{ color }}
                    />
                );
            case "filled":
                return (
                    <Icon
                        icon="solar:cursor-bold-duotone"
                        width={size}
                        className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
                        style={{ color }}
                    />
                );
            case "glass":
                return (
                    <div
                        className="flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                        style={{ width: size, height: size }}
                    >
                        <Icon
                            icon="solar:cursor-bold"
                            width={34}
                            className="text-white"
                        />
                    </div>
                );
            case "neon":
                return (
                    <Icon
                        icon="solar:cursor-bold-duotone"
                        width={size}
                        className="drop-shadow-[0_0_18px_rgba(59,130,246,0.95)]"
                        style={{ color }}
                    />
                );
            default:
                return (
                    <Icon
                        icon="radix-icons:value-none"
                        width={size}
                        className="text-white/30"
                    />
                );
        }
    };

    return (
        <div className="flex flex-col gap-5 p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold text-white">
                    <Icon
                        icon="solar:cursor-bold-duotone"
                        width="20"
                        className="text-blue-300"
                        aria-hidden="true"
                    />
                    <span>Cursor</span>
                </div>

                <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-200">
                    Premium
                </span>
            </div>

            {!isRecordedVideo ? (
                <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-xs leading-relaxed text-yellow-100/80">
                    <div className="flex items-start gap-2">
                        <Icon
                            icon="ph:warning"
                            width="17"
                            className="mt-0.5 shrink-0 text-yellow-300"
                        />
                        <p>
                            Los videos subidos no incluyen datos reales del cursor.
                            Puedes configurar el estilo, pero el overlay real dependerá
                            de grabaciones hechas desde la app.
                        </p>
                    </div>
                </div>
            ) : null}

            {isRecordedVideo && !hasCursorData ? (
                <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-3 text-xs leading-relaxed text-blue-100/80">
                    <div className="flex items-start gap-2">
                        <Icon
                            icon="ph:info"
                            width="17"
                            className="mt-0.5 shrink-0 text-blue-300"
                        />
                        <p>
                            Esta grabación no tiene tracking avanzado. El cursor se
                            podrá mostrar con posición estimada cuando habilitemos la
                            capa de render.
                        </p>
                    </div>
                </div>
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.18),rgba(255,255,255,0.04)_42%,rgba(0,0,0,0.18)_100%)] p-5">
                <div className="relative mx-auto flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                    {mergedConfig.spotlightEnabled ? (
                        <div
                            className="absolute inset-0"
                            style={{
                                background: `radial-gradient(circle at 50% 50%, transparent 0px, transparent ${Math.max(
                                    80,
                                    mergedConfig.spotlightSize / 3
                                )}px, rgba(0,0,0,${
                                    mergedConfig.spotlightIntensity / 100
                                }) ${Math.max(130, mergedConfig.spotlightSize / 2)}px)`,
                                filter: `blur(${Math.max(
                                    0,
                                    mergedConfig.spotlightBlur / 8
                                )}px)`,
                            }}
                        />
                    ) : null}

                    <div className="relative">
                        {mergedConfig.style !== "none" ? getCursorPreviewElement() : null}

                        {mergedConfig.clickEffect !== "none" ? (
                            <div
                                className="absolute left-1/2 top-1/2 rounded-full opacity-40 animate-ping"
                                style={{
                                    width: 42,
                                    height: 42,
                                    marginLeft: -21,
                                    marginTop: -21,
                                    backgroundColor: mergedConfig.clickEffectColor,
                                }}
                            />
                        ) : null}
                    </div>
                </div>
            </div>

            <ToggleRow
                icon="ph:eye-bold"
                label="Mostrar cursor"
                description="Activa u oculta el cursor personalizado sobre el video."
                checked={mergedConfig.visible}
                onChange={(visible) => onCursorConfigChange({ visible })}
            />

            {mergedConfig.visible ? (
                <>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                Estilo del cursor
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    onCursorConfigChange({
                                        style: DEFAULT_CURSOR_CONFIG.style,
                                        color: DEFAULT_CURSOR_CONFIG.color,
                                        size: DEFAULT_CURSOR_CONFIG.size,
                                    })
                                }
                                className="text-xs font-semibold text-blue-300 transition hover:text-blue-200"
                            >
                                Restablecer
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {CURSOR_STYLES.map((style) => (
                                <TooltipAction
                                    label={style.description}
                                    key={style.id}
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onCursorConfigChange({
                                                style: style.id,
                                            })
                                        }
                                        className={`group flex min-h-19 flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-all active:scale-[0.98] ${
                                            mergedConfig.style === style.id
                                                ? "border-blue-400/70 bg-blue-500/20 text-white shadow-[0_0_30px_rgba(59,130,246,0.16)]"
                                                : "border-white/10 bg-white/[0.03] text-white/45 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80"
                                        }`}
                                    >
                                        <Icon
                                            icon={style.icon}
                                            width="24"
                                            className="transition group-hover:scale-105"
                                            aria-hidden="true"
                                        />
                                        <span className="text-[11px] font-semibold">
                                            {style.name}
                                        </span>
                                    </button>
                                </TooltipAction>
                            ))}
                        </div>
                    </div>

                    {mergedConfig.style !== "none" ? (
                        <>
                            <div className="space-y-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    Color
                                </div>

                                <div className="grid grid-cols-8 gap-2">
                                    {PRESET_COLORS.map((color) => (
                                        <TooltipAction label={color} key={color}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onCursorConfigChange({
                                                        color,
                                                    })
                                                }
                                                className={`aspect-square rounded-xl border transition-all ${
                                                    mergedConfig.color === color
                                                        ? "scale-105 border-white/80 ring-2 ring-blue-400/70"
                                                        : "border-white/15 hover:scale-105 hover:border-white/40"
                                                }`}
                                                style={{ backgroundColor: color }}
                                                aria-label={`Color ${color}`}
                                            />
                                        </TooltipAction>
                                    ))}
                                </div>

                                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/50 transition hover:bg-white/[0.06]">
                                    <span>Color personalizado</span>
                                    <input
                                        type="color"
                                        value={mergedConfig.color}
                                        onChange={(event) =>
                                            onCursorConfigChange({
                                                color: event.target.value,
                                            })
                                        }
                                        className="h-8 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                                    />
                                </label>
                            </div>

                            <SliderControl
                                icon="mdi:resize"
                                label="Tamaño del cursor"
                                value={mergedConfig.size}
                                onChange={(size) =>
                                    onCursorConfigChange({ size })
                                }
                                min={16}
                                max={96}
                            />

                            <SliderControl
                                icon="ph:wave-sine"
                                label="Suavizado"
                                value={mergedConfig.smoothing}
                                onChange={(smoothing) =>
                                    onCursorConfigChange({ smoothing })
                                }
                                min={0}
                                max={100}
                            />

                            <div className="h-px bg-white/10" />

                            <div className="space-y-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    Efecto de click del cursor
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {CLICK_EFFECTS.map((effect) => (
                                        <button
                                            type="button"
                                            key={effect.id}
                                            onClick={() =>
                                                onCursorConfigChange({
                                                    clickEffect: effect.id,
                                                    spotlightEnabled:
                                                        effect.id === "spotlight"
                                                            ? true
                                                            : mergedConfig.spotlightEnabled,
                                                })
                                            }
                                            className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-xs font-semibold transition-all active:scale-[0.98] ${
                                                mergedConfig.clickEffect === effect.id
                                                    ? "border-blue-400/70 bg-blue-500/20 text-white shadow-[0_0_30px_rgba(59,130,246,0.14)]"
                                                    : "border-white/10 bg-white/[0.03] text-white/45 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80"
                                            }`}
                                        >
                                            <Icon
                                                icon={effect.icon}
                                                width="22"
                                                aria-hidden="true"
                                            />
                                            {effect.name}
                                        </button>
                                    ))}
                                </div>

                                {mergedConfig.clickEffect !== "none" ? (
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                        <div className="mb-2 text-xs font-semibold text-white/50">
                                            Color del efecto
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                "#3B82F6",
                                                "#EF4444",
                                                "#10B981",
                                                "#F59E0B",
                                                "#8B5CF6",
                                                "#06B6D4",
                                            ].map((color) => (
                                                <button
                                                    type="button"
                                                    key={color}
                                                    onClick={() =>
                                                        onCursorConfigChange({
                                                            clickEffectColor: color,
                                                        })
                                                    }
                                                    className={`h-7 w-7 rounded-full transition-all ${
                                                        mergedConfig.clickEffectColor ===
                                                        color
                                                            ? "scale-110 ring-2 ring-white/70"
                                                            : "hover:scale-105"
                                                    }`}
                                                    style={{
                                                        backgroundColor: color,
                                                    }}
                                                    aria-label={`Effect color ${color}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="h-px bg-white/10" />

                            <ToggleRow
                                icon="solar:flashlight-on-bold"
                                label="Spotlight"
                                description="Oscurece el fondo y resalta el área del cursor."
                                checked={mergedConfig.spotlightEnabled}
                                onChange={(spotlightEnabled) =>
                                    onCursorConfigChange({
                                        spotlightEnabled,
                                    })
                                }
                            />

                            {mergedConfig.spotlightEnabled ? (
                                <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        {SPOTLIGHT_SHAPES.map((shape) => (
                                            <button
                                                type="button"
                                                key={shape.id}
                                                onClick={() =>
                                                    onCursorConfigChange({
                                                        spotlightShape: shape.id,
                                                    })
                                                }
                                                className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-xs font-semibold transition ${
                                                    mergedConfig.spotlightShape ===
                                                    shape.id
                                                        ? "border-blue-400/60 bg-blue-500/20 text-white"
                                                        : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/80"
                                                }`}
                                            >
                                                <Icon
                                                    icon={shape.icon}
                                                    width="20"
                                                    aria-hidden="true"
                                                />
                                                {shape.name}
                                            </button>
                                        ))}
                                    </div>

                                    <SliderControl
                                        icon="solar:contrast-bold"
                                        label="Intensidad"
                                        value={mergedConfig.spotlightIntensity}
                                        onChange={(spotlightIntensity) =>
                                            onCursorConfigChange({
                                                spotlightIntensity,
                                            })
                                        }
                                        min={10}
                                        max={90}
                                    />

                                    <SliderControl
                                        icon="solar:maximize-square-3-bold"
                                        label="Tamaño"
                                        value={mergedConfig.spotlightSize}
                                        onChange={(spotlightSize) =>
                                            onCursorConfigChange({
                                                spotlightSize,
                                            })
                                        }
                                        min={120}
                                        max={520}
                                    />

                                    <SliderControl
                                        icon="mdi:blur"
                                        label="Suavidad"
                                        value={mergedConfig.spotlightBlur}
                                        onChange={(spotlightBlur) =>
                                            onCursorConfigChange({
                                                spotlightBlur,
                                            })
                                        }
                                        min={0}
                                        max={80}
                                    />
                                </div>
                            ) : null}

                            <div className="h-px bg-white/10" />

                            <ToggleRow
                                icon="solar:eye-closed-bold"
                                label="Ocultar automáticamente"
                                description="Oculta el cursor después de un tiempo sin movimiento."
                                checked={mergedConfig.autoHide}
                                onChange={(autoHide) =>
                                    onCursorConfigChange({ autoHide })
                                }
                            />

                            {mergedConfig.autoHide ? (
                                <SliderControl
                                    icon="solar:timer-bold"
                                    label="Tiempo de espera"
                                    value={mergedConfig.autoHideDelay}
                                    onChange={(autoHideDelay) =>
                                        onCursorConfigChange({
                                            autoHideDelay,
                                        })
                                    }
                                    min={0.5}
                                    max={5}
                                />
                            ) : null}

                            <ToggleRow
                                icon="solar:volume-loud-bold"
                                label="Sonido al hacer click"
                                description="Prepara SFX de click para la exportación."
                                checked={mergedConfig.clickSound}
                                onChange={(clickSound) =>
                                    onCursorConfigChange({ clickSound })
                                }
                            />
                        </>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}