import { VideoThumbnail } from "./editor.types";

export type ZoomCinematicMode = "smooth" | "push" | "dramatic" | "subtle";

export interface ZoomFragment {
    id: string;
    startTime: number;
    endTime: number;
    zoomLevel: number;
    speed: number;
    focusX: number;
    focusY: number;

    movementEnabled?: boolean;
    movementEndX?: number;
    movementEndY?: number;
    movementStartOffset?: number;
    movementEndOffset?: number;

    enable3D?: boolean;
    perspective3DIntensity?: number;
    perspective3DAngleX?: number;
    perspective3DAngleY?: number;

    cinematicMode?: ZoomCinematicMode;

    /** Sigue el cursor grabado dentro del fragmento de zoom cuando hay datos de cursor disponibles. */
    followCursor?: boolean;
    /** Qué tanto se acerca el centro de cámara al cursor. 0 = manual, 1 = cursor completo. */
    followStrength?: number;
    /** Suavidad del seguimiento. 0 = reactivo, 1 = muy suave. */
    followSmoothing?: number;
    /** Zona muerta en porcentaje para evitar micro movimientos. */
    followDeadzone?: number;
}

export interface ZoomTimelineState {
    fragments: ZoomFragment[];
    selectedFragmentId: string | null;
}

export interface ZoomFragmentEditorProps {
    fragment: ZoomFragment;
    videoUrl: string | null;
    videoThumbnail?: string | null;
    currentTime?: number;
    getThumbnailForTime?: (time: number) => VideoThumbnail | null;
    videoDimensions?: { width: number; height: number } | null;
    onBack: () => void;
    onDelete: () => void;
    onUpdate: (updates: Partial<ZoomFragment>) => void;
}

export interface ZoomPhaseState {
    phase: "entry" | "hold" | "exit";
    scale: number;
    focusX: number;
    focusY: number;
    progress: number;
    rotateX: number;
    rotateY: number;
    perspective: number;
    velocity: number;
}

export interface ZoomStateCanvas {
    scale: number;
    focusX: number;
    focusY: number;
}

export type ZoomModeConfig = {
    label: string;
    description: string;
    entryRatio: number;
    exitRatio: number;
    motionEase: (t: number) => number;
    entryEase: (t: number) => number;
    exitEase: (t: number) => number;
    overshoot: number;
    damping: number;
};

const DEFAULT_ZOOM_LEVEL = 2.2;
const DEFAULT_ZOOM_SPEED = 6;

export const ZOOM_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
export const ZOOM_RELEASE_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
export const ZOOM_LINEAR_MOVEMENT_EASING = "cubic-bezier(0.33, 1, 0.68, 1)";

export function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

export function lerp(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
}

export function easeOutQuart(t: number): number {
    const x = clamp(t);
    return 1 - Math.pow(1 - x, 4);
}

export function easeInOutQuart(t: number): number {
    const x = clamp(t);
    return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

export function easeOutExpo(t: number): number {
    const x = clamp(t);
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

export function easeInOutCinematic(t: number): number {
    const x = clamp(t);
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    return x < 0.5
        ? Math.pow(2, 20 * x - 10) / 2
        : (2 - Math.pow(2, -20 * x + 10)) / 2;
}

export function easeInOutSine(t: number): number {
    const x = clamp(t);
    return -(Math.cos(Math.PI * x) - 1) / 2;
}

export function smootherStep(t: number): number {
    const x = clamp(t);
    return x * x * x * (x * (x * 6 - 15) + 10);
}

export function springOut(t: number): number {
    const x = clamp(t);
    if (x === 0 || x === 1) return x;
    return 1 - Math.pow(2, -9 * x) * Math.cos(x * Math.PI * 2.25);
}

export function getZoomModeConfig(mode: ZoomCinematicMode = "smooth"): ZoomModeConfig {
    const configs: Record<ZoomCinematicMode, ZoomModeConfig> = {
        smooth: {
            label: "Suave",
            description: "Movimiento equilibrado y cinematográfico",
            entryRatio: 0.28,
            exitRatio: 0.3,
            motionEase: smootherStep,
            entryEase: easeOutExpo,
            exitEase: easeInOutSine,
            overshoot: 0,
            damping: 0.92,
        },
        push: {
            label: "Impulso",
            description: "Entrada rápida con salida suave",
            entryRatio: 0.22,
            exitRatio: 0.34,
            motionEase: easeInOutCinematic,
            entryEase: springOut,
            exitEase: easeOutQuart,
            overshoot: 0.025,
            damping: 0.88,
        },
        dramatic: {
            label: "Dramático",
            description: "Más presencia de cámara y transiciones largas",
            entryRatio: 0.34,
            exitRatio: 0.38,
            motionEase: easeInOutCinematic,
            entryEase: springOut,
            exitEase: easeInOutCinematic,
            overshoot: 0.045,
            damping: 0.82,
        },
        subtle: {
            label: "Sutil",
            description: "Enfoque ligero sin movimiento agresivo",
            entryRatio: 0.2,
            exitRatio: 0.24,
            motionEase: easeInOutSine,
            entryEase: easeOutQuart,
            exitEase: easeInOutSine,
            overshoot: 0,
            damping: 0.96,
        },
    };

    return configs[mode];
}

export function zoomLevelToFactor(level: number): number {
    const minZoom = 1.04;
    const maxZoom = 4.8;
    const normalized = clamp((level - 1) / 9);

    // Slight curve so low zoom values are easier to fine tune.
    const curved = Math.pow(normalized, 0.88);
    return minZoom + (maxZoom - minZoom) * curved;
}

export function speedToTransitionMs(speed: number): number {
    const minMs = 220;
    const maxMs = 1900;
    const normalized = clamp((speed - 1) / 9);

    return Math.round(maxMs - (maxMs - minMs) * normalized);
}

function calculateTransitionWindows(fragment: ZoomFragment) {
    const totalDuration = Math.max(0.01, fragment.endTime - fragment.startTime);
    const mode = getZoomModeConfig(fragment.cinematicMode ?? "smooth");
    const speedSeconds = speedToTransitionMs(fragment.speed) / 1000;

    const entryDuration = Math.min(
        speedSeconds * (0.72 + mode.entryRatio),
        totalDuration * Math.min(0.46, mode.entryRatio + 0.08)
    );

    const exitDuration = Math.min(
        speedSeconds * (0.72 + mode.exitRatio),
        totalDuration * Math.min(0.48, mode.exitRatio + 0.08)
    );

    const entryEndTime = fragment.startTime + entryDuration;
    const exitStartTime = Math.max(entryEndTime, fragment.endTime - exitDuration);
    const holdDuration = Math.max(0, exitStartTime - entryEndTime);

    return {
        totalDuration,
        mode,
        entryDuration,
        exitDuration,
        entryEndTime,
        exitStartTime,
        holdDuration,
    };
}

export function calculateZoomPhaseState(
    fragment: ZoomFragment,
    currentTime: number,
    forExport: boolean = false
): ZoomPhaseState {
    const {
        mode,
        entryDuration,
        exitDuration,
        entryEndTime,
        exitStartTime,
        holdDuration,
    } = calculateTransitionWindows(fragment);

    const targetScaleBase = zoomLevelToFactor(fragment.zoomLevel);
    const targetScale = fragment.cinematicMode === "subtle"
        ? 1 + (targetScaleBase - 1) * 0.86
        : targetScaleBase;

    const movementEndX = fragment.movementEndX ?? fragment.focusX;
    const movementEndY = fragment.movementEndY ?? fragment.focusY;

    let phase: "entry" | "hold" | "exit" = "hold";
    let progress = 1;
    let easedScaleProgress = 1;
    let scale = targetScale;
    let focusX = fragment.focusX;
    let focusY = fragment.focusY;
    let rotateX = 0;
    let rotateY = 0;
    let perspective = 0;
    let velocity = 0;

    if (currentTime < entryEndTime && entryDuration > 0) {
        phase = "entry";
        progress = clamp((currentTime - fragment.startTime) / entryDuration);
        easedScaleProgress = mode.entryEase(progress);
        const overshoot = mode.overshoot * Math.sin(progress * Math.PI);
        scale = 1 + (targetScale - 1) * (easedScaleProgress + overshoot);
        velocity = 1 - progress;
    } else if (currentTime >= exitStartTime && exitDuration > 0) {
        phase = "exit";
        progress = clamp((currentTime - exitStartTime) / exitDuration);
        const releaseProgress = mode.exitEase(progress);
        scale = targetScale - (targetScale - 1) * releaseProgress;
        velocity = progress;

        if (fragment.movementEnabled) {
            focusX = movementEndX;
            focusY = movementEndY;
        }
    } else {
        phase = "hold";
        progress = holdDuration > 0 ? clamp((currentTime - entryEndTime) / holdDuration) : 1;
        scale = targetScale;

        if (fragment.movementEnabled && holdDuration > 0) {
            const movementStartOffset = fragment.movementStartOffset ?? 0;
            const movementEndOffset = fragment.movementEndOffset ?? holdDuration;

            const movementStartTime = entryEndTime + clamp(movementStartOffset / holdDuration) * holdDuration;
            const movementEndTime = entryEndTime + clamp(movementEndOffset / holdDuration) * holdDuration;
            const movementDuration = Math.max(0.01, movementEndTime - movementStartTime);

            if (currentTime >= movementStartTime && currentTime <= movementEndTime) {
                const movementProgress = clamp((currentTime - movementStartTime) / movementDuration);
                const easedMovement = mode.motionEase(movementProgress);

                focusX = lerp(fragment.focusX, movementEndX, easedMovement);
                focusY = lerp(fragment.focusY, movementEndY, easedMovement);
                progress = movementProgress;
                velocity = Math.sin(movementProgress * Math.PI) * mode.damping;
            } else if (currentTime > movementEndTime) {
                focusX = movementEndX;
                focusY = movementEndY;
                progress = 1;
            }
        }
    }

    if (fragment.enable3D) {
        const intensity = clamp((fragment.perspective3DIntensity ?? 45) / 100);
        const baseAngleX = fragment.perspective3DAngleX ?? 0;
        const baseAngleY = fragment.perspective3DAngleY ?? 0;

        let effect3DOpacity = 1;
        if (phase === "entry") effect3DOpacity = easeOutQuart(progress);
        if (phase === "exit") effect3DOpacity = 1 - easeOutQuart(progress);

        const maxRotation = (fragment.cinematicMode === "dramatic" ? 24 : 18) * intensity;
        perspective = 560 + 160 * intensity;
        rotateX = (baseAngleX / 45) * maxRotation * effect3DOpacity;
        rotateY = (baseAngleY / 45) * maxRotation * effect3DOpacity;
    }

    // Avoid tiny floating point scale offsets at rest in export and preview.
    if ((forExport || phase === "exit") && scale < 1.002) scale = 1;

    return {
        phase,
        scale,
        focusX,
        focusY,
        progress,
        rotateX,
        rotateY,
        perspective,
        velocity,
    };
}

export interface ZoomCursorFollowFrame {
    x: number;
    y: number;
    clicking?: boolean;
}

export function calculateCursorFollowFocus(
    fragment: ZoomFragment,
    baseFocusX: number,
    baseFocusY: number,
    cursorFrame: ZoomCursorFollowFrame | null | undefined
): { focusX: number; focusY: number; followAmount: number } {
    if (!fragment.followCursor || !cursorFrame) {
        return { focusX: baseFocusX, focusY: baseFocusY, followAmount: 0 };
    }

    const strength = clamp(fragment.followStrength ?? 0.76, 0, 1);
    const smoothing = clamp(fragment.followSmoothing ?? 0.62, 0, 1);
    const deadzone = Math.max(0, fragment.followDeadzone ?? 7);

    const dx = cursorFrame.x - baseFocusX;
    const dy = cursorFrame.y - baseFocusY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= deadzone) {
        return { focusX: baseFocusX, focusY: baseFocusY, followAmount: 0 };
    }

    const distanceFactor = clamp((distance - deadzone) / Math.max(1, 60 - deadzone));
    const smoothFactor = 1 - smoothing * 0.52;
    const clickBoost = cursorFrame.clicking ? 1.08 : 1;
    const followAmount = clamp(strength * distanceFactor * smoothFactor * clickBoost, 0, 0.96);

    return {
        focusX: clamp(lerp(baseFocusX, cursorFrame.x, followAmount), 2, 98),
        focusY: clamp(lerp(baseFocusY, cursorFrame.y, followAmount), 2, 98),
        followAmount,
    };
}

export function calculateHoldDuration(fragment: ZoomFragment): number {
    const { holdDuration } = calculateTransitionWindows(fragment);
    return holdDuration;
}

export function createZoomFragment(
    startTime: number,
    endTime: number
): ZoomFragment {
    return {
        id: `zoom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        startTime,
        endTime,
        zoomLevel: DEFAULT_ZOOM_LEVEL,
        speed: DEFAULT_ZOOM_SPEED,
        focusX: 50,
        focusY: 50,
        movementEnabled: false,
        movementEndX: 50,
        movementEndY: 50,
        movementStartOffset: 0,
        movementEndOffset: Math.max(0, endTime - startTime),
        enable3D: false,
        perspective3DIntensity: 35,
        perspective3DAngleX: 0,
        perspective3DAngleY: 0,
        cinematicMode: "smooth",
        followCursor: false,
        followStrength: 0.76,
        followSmoothing: 0.62,
        followDeadzone: 7,
    };
}

export function generateDefaultZoomFragments(
    videoDuration: number
): ZoomFragment[] {
    if (videoDuration <= 0) return [];

    const fragmentDuration = Math.min(2.8, Math.max(1.6, videoDuration * 0.18));
    const fragments: ZoomFragment[] = [];

    if (videoDuration >= 4) {
        const start1 = Math.max(0, videoDuration * 0.18);

        fragments.push({
            ...createZoomFragment(
                start1,
                Math.min(start1 + fragmentDuration, videoDuration)
            ),
            zoomLevel: 2.15,
            speed: 6.2,
            focusX: 50,
            focusY: 45,
            movementEnabled: true,
            movementEndX: 54,
            movementEndY: 48,
            cinematicMode: "smooth",
        });
    }

    if (videoDuration >= 8) {
        const start2 = Math.max(0, videoDuration * 0.58);

        fragments.push({
            ...createZoomFragment(
                start2,
                Math.min(start2 + fragmentDuration, videoDuration)
            ),
            zoomLevel: 2.65,
            speed: 7.2,
            focusX: 45,
            focusY: 50,
            movementEnabled: true,
            movementEndX: 56,
            movementEndY: 50,
            cinematicMode: "push",
        });
    }

    return fragments;
}

export function formatZoomTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
}
