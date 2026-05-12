/**
 * Cursor Types - Custom cursor overlays, click effects and spotlight/highlight tools.
 */

export type CursorState =
    | "default"
    | "pointer"
    | "text"
    | "grab"
    | "grabbing"
    | "wait"
    | "progress"
    | "not-allowed"
    | "crosshair"
    | "move"
    | "resize";

export interface CursorKeyframe {
    time: number;
    x: number;
    y: number;
    state: CursorState;
    clicking: boolean;
}

export type CursorStyle =
    | "none"
    | "mac"
    | "windows"
    | "dot"
    | "outline"
    | "filled"
    | "glass"
    | "neon";

export type ClickEffect =
    | "none"
    | "standard"
    | "ripple"
    | "ring"
    | "pulse"
    | "spotlight"
    | "focus"
    | "flash";

export type SpotlightShape = "circle" | "rounded" | "beam";

export interface CursorConfig {
    style: CursorStyle;
    color: string;
    size: number;
    smoothing: number;

    clickEffect: ClickEffect;
    clickEffectColor: string;

    visible: boolean;

    autoHide: boolean;
    autoHideDelay: number;

    clickSound: boolean;

    spotlightEnabled: boolean;
    spotlightShape: SpotlightShape;
    spotlightIntensity: number;
    spotlightSize: number;
    spotlightBlur: number;
}

export const DEFAULT_CURSOR_CONFIG: CursorConfig = {
    style: "mac",
    color: "#FFFFFF",
    size: 32,
    smoothing: 50,

    clickEffect: "standard",
    clickEffectColor: "#3B82F6",

    visible: true,

    autoHide: false,
    autoHideDelay: 1.2,

    clickSound: false,

    spotlightEnabled: false,
    spotlightShape: "circle",
    spotlightIntensity: 55,
    spotlightSize: 260,
    spotlightBlur: 32,
};

export interface CursorRecordingData {
    keyframes: CursorKeyframe[];
    videoDimensions: {
        width: number;
        height: number;
    };
    frameRate: number;
    hasCursorData: boolean;
}

export const EMPTY_CURSOR_DATA: CursorRecordingData = {
    keyframes: [],
    videoDimensions: {
        width: 1920,
        height: 1080,
    },
    frameRate: 60,
    hasCursorData: false,
};

export function interpolateCursorPosition(
    keyframes: CursorKeyframe[],
    time: number,
    smoothing: number = 50
): CursorKeyframe | null {
    if (keyframes.length === 0) return null;

    let prevFrame: CursorKeyframe | null = null;
    let nextFrame: CursorKeyframe | null = null;

    for (let i = 0; i < keyframes.length; i++) {
        if (keyframes[i].time <= time) {
            prevFrame = keyframes[i];
        }

        if (keyframes[i].time >= time && !nextFrame) {
            nextFrame = keyframes[i];
            break;
        }
    }

    if (!prevFrame) return keyframes[0];
    if (!nextFrame) return keyframes[keyframes.length - 1];
    if (prevFrame === nextFrame) return prevFrame;

    const duration = nextFrame.time - prevFrame.time;

    if (duration <= 0) return prevFrame;

    const progress = Math.max(0, Math.min(1, (time - prevFrame.time) / duration));
    const smoothingFactor = smoothing / 100;
    const easedProgress =
        easeInOutCubic(progress) * smoothingFactor +
        progress * (1 - smoothingFactor);

    return {
        time,
        x: lerp(prevFrame.x, nextFrame.x, easedProgress),
        y: lerp(prevFrame.y, nextFrame.y, easedProgress),
        state: progress < 0.5 ? prevFrame.state : nextFrame.state,
        clicking: prevFrame.clicking || nextFrame.clicking,
    };
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function supportsCursorCapture(): boolean {
    if (typeof window === "undefined") return false;
    return "CaptureController" in window;
}