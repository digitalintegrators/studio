import { VideoThumbnail } from "./editor.types";

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

    cinematicMode?: "smooth" | "push" | "dramatic" | "subtle";
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
}

export interface ZoomStateCanvas {
    scale: number;
    focusX: number;
    focusY: number;
}

const DEFAULT_ZOOM_LEVEL = 2.2;
const DEFAULT_ZOOM_SPEED = 6;

export const ZOOM_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

export function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
}

export function easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

export function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutCinematic(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    return t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

export function zoomLevelToFactor(level: number): number {
    const minZoom = 1.05;
    const maxZoom = 4.5;
    const normalized = Math.max(0, Math.min(1, (level - 1) / 9));

    return minZoom + (maxZoom - minZoom) * normalized;
}

export function speedToTransitionMs(speed: number): number {
    const minMs = 180;
    const maxMs = 1800;
    const normalized = Math.max(0, Math.min(1, (speed - 1) / 9));

    return Math.round(maxMs - (maxMs - minMs) * normalized);
}

export function calculateZoomPhaseState(
    fragment: ZoomFragment,
    currentTime: number,
    forExport: boolean = false
): ZoomPhaseState {
    const totalDuration = Math.max(0.01, fragment.endTime - fragment.startTime);
    const elapsed = currentTime - fragment.startTime;
    const normalizedTime = Math.max(0, Math.min(1, elapsed / totalDuration));

    const targetScale = zoomLevelToFactor(fragment.zoomLevel);
    const transitionSeconds = Math.min(
        speedToTransitionMs(fragment.speed) / 1000,
        totalDuration / 2
    );

    const entryEndTime = fragment.startTime + transitionSeconds;
    const exitStartTime = fragment.endTime - transitionSeconds;
    const holdDuration = Math.max(0, exitStartTime - entryEndTime);

    const movementEndX = fragment.movementEndX ?? fragment.focusX;
    const movementEndY = fragment.movementEndY ?? fragment.focusY;

    let phase: "entry" | "hold" | "exit" = "hold";
    let progress = normalizedTime;
    let scale = forExport ? 1 : targetScale;
    let focusX = fragment.focusX;
    let focusY = fragment.focusY;
    let rotateX = 0;
    let rotateY = 0;
    let perspective = 0;

    const cinematicMode = fragment.cinematicMode ?? "smooth";

    const entryEase =
        cinematicMode === "dramatic"
            ? easeOutExpo
            : cinematicMode === "push"
              ? easeInOutCinematic
              : easeOutQuart;

    const exitEase =
        cinematicMode === "dramatic"
            ? easeInOutCinematic
            : easeOutQuart;

    if (currentTime < entryEndTime && transitionSeconds > 0) {
        phase = "entry";

        const rawProgress = (currentTime - fragment.startTime) / transitionSeconds;
        progress = Math.max(0, Math.min(1, rawProgress));

        const easedProgress = entryEase(progress);
        scale = 1 + (targetScale - 1) * easedProgress;
    } else if (currentTime >= exitStartTime && transitionSeconds > 0) {
        phase = "exit";

        const rawProgress = (currentTime - exitStartTime) / transitionSeconds;
        progress = Math.max(0, Math.min(1, rawProgress));

        const easedProgress = exitEase(progress);
        scale = targetScale - (targetScale - 1) * easedProgress;

        if (fragment.movementEnabled) {
            focusX = movementEndX;
            focusY = movementEndY;
        }
    } else {
        phase = "hold";
        scale = targetScale;

        if (fragment.movementEnabled && holdDuration > 0) {
            const movementStartOffset = fragment.movementStartOffset ?? 0;
            const movementEndOffset = fragment.movementEndOffset ?? holdDuration;

            const movementStartTime =
                entryEndTime + Math.max(0, Math.min(movementStartOffset, holdDuration));

            const movementEndTime =
                entryEndTime +
                Math.max(movementStartOffset, Math.min(movementEndOffset, holdDuration));

            const movementDuration = movementEndTime - movementStartTime;

            if (
                currentTime >= movementStartTime &&
                currentTime <= movementEndTime &&
                movementDuration > 0
            ) {
                const movementProgress =
                    (currentTime - movementStartTime) / movementDuration;

                const easedProgress = easeInOutQuart(Math.min(1, movementProgress));

                focusX = fragment.focusX + (movementEndX - fragment.focusX) * easedProgress;
                focusY = fragment.focusY + (movementEndY - fragment.focusY) * easedProgress;
                progress = movementProgress;
            } else if (currentTime > movementEndTime) {
                focusX = movementEndX;
                focusY = movementEndY;
                progress = 1;
            }
        }
    }

    if (fragment.enable3D) {
        const intensity = Math.max(
            0,
            Math.min(1, (fragment.perspective3DIntensity ?? 45) / 100)
        );

        const baseAngleX = fragment.perspective3DAngleX ?? 0;
        const baseAngleY = fragment.perspective3DAngleY ?? 0;

        let effect3DOpacity = 1;

        if (phase === "entry") {
            effect3DOpacity = easeOutQuart(progress);
        } else if (phase === "exit") {
            effect3DOpacity = 1 - easeOutQuart(progress);
        }

        perspective = 520;

        const maxRotation = 22 * intensity;

        rotateX = (baseAngleX / 45) * maxRotation * effect3DOpacity;
        rotateY = (baseAngleY / 45) * maxRotation * effect3DOpacity;
    }

    return {
        phase,
        scale,
        focusX,
        focusY,
        progress,
        rotateX,
        rotateY,
        perspective,
    };
}

export function calculateHoldDuration(fragment: ZoomFragment): number {
    const totalDuration = fragment.endTime - fragment.startTime;
    const transitionSeconds = speedToTransitionMs(fragment.speed) / 1000;

    return Math.max(0, totalDuration - 2 * transitionSeconds);
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
    };
}

export function generateDefaultZoomFragments(
    videoDuration: number
): ZoomFragment[] {
    if (videoDuration <= 0) return [];

    const fragmentDuration = Math.min(2.4, Math.max(1.4, videoDuration * 0.18));
    const fragments: ZoomFragment[] = [];

    if (videoDuration >= 4) {
        const start1 = Math.max(0, videoDuration * 0.18);

        fragments.push({
            ...createZoomFragment(
                start1,
                Math.min(start1 + fragmentDuration, videoDuration)
            ),
            zoomLevel: 2.1,
            speed: 6,
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
            zoomLevel: 2.6,
            speed: 7,
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