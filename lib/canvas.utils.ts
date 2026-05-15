import { AspectRatio } from "@/types/editor.types";
import { ZoomStateCanvas, ZoomFragment, calculateZoomPhaseState, zoomLevelToFactor, speedToTransitionMs, easeOutQuart, calculateCursorFollowFocus } from "@/types/zoom.types";
import type { CursorRecordingData } from "@/types/cursor.types";
import { interpolateCursorPosition } from "@/types/cursor.types";
export function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

export function drawRoundedRectBottomOnly(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.closePath();
}

export function calculateScaledPadding(
    containerSize: number,
    paddingPercent: number
): number {
    return paddingPercent * containerSize;
}

export function getAspectRatioStyle(ratio: AspectRatio, customDimensions?: { width: number; height: number }): string {
    if ((ratio === "custom" || ratio === "auto") && customDimensions) {
        return `${customDimensions.width}/${customDimensions.height}`;
    }
    
    switch (ratio) {
        case "16:9": return "16/9";
        case "9:16": return "9/16";
        case "1:1": return "1/1";
        case "4:3": return "4/3";
        case "3:4": return "3/4";
        default: return "16/9";
    }
}

// Función para obtener max-width basado en aspect ratio
export function getMaxWidth(ratio: AspectRatio, customDimensions?: { width: number; height: number }): string {
    if ((ratio === "custom" || ratio === "auto") && customDimensions) {
        const aspectValue = customDimensions.width / customDimensions.height;
        if (aspectValue > 1.5) return "52rem"; // Landscape
        if (aspectValue < 0.7) return "20rem"; // Portrait
        return "32rem"; // Square-ish
    }
    
    switch (ratio) {
        case "16:9": return "52rem";
        case "9:16": return "20rem";
        case "3:4": return "26rem";
        case "4:3": return "40rem";
        case "1:1": return "32rem";
        default: return "52rem";
    }
}

export function calculateScaledProperties(
    padding: number,
    roundedCorners: number,
    shadows: number,
    canvasWidth: number,
    canvasHeight: number
) {
    const paddingPercent = padding * 0.5 / 100;
    const scaledPaddingX = paddingPercent * canvasWidth;
    const scaledPaddingY = paddingPercent * canvasHeight;
    const scaledRadius = roundedCorners * (canvasWidth / 896);
    const scaledShadowBlur = shadows * (canvasWidth / 896) * 0.3;

    return {
        scaledPaddingX,
        scaledPaddingY,
        scaledRadius,
        scaledShadowBlur,
    };
}

export function applyCanvasBackground(
    ctx: CanvasRenderingContext2D,
    cssBackground: string,
    width: number,
    height: number
): void {
    if (cssBackground.startsWith('#') || cssBackground.startsWith('rgb')) {
        ctx.fillStyle = cssBackground;
        ctx.fillRect(0, 0, width, height);
        return;
    }

    if (cssBackground.includes('linear-gradient')) {
        const angleMatch = cssBackground.match(/(\d+)deg/);
        const angle = angleMatch ? parseInt(angleMatch[1]) : 135;
        
        const colorMatches = cssBackground.matchAll(/(#[0-9a-fA-F]{6}|rgb\([^)]+\))\s+(\d+)%/g);
        const stops: { color: string; position: number }[] = [];
        
        for (const match of colorMatches) {
            stops.push({
                color: match[1],
                position: parseInt(match[2]) / 100
            });
        }

        if (stops.length >= 2) {
            const angleRad = (angle - 90) * Math.PI / 180;
            const x0 = width / 2 - Math.cos(angleRad) * width / 2;
            const y0 = height / 2 - Math.sin(angleRad) * height / 2;
            const x1 = width / 2 + Math.cos(angleRad) * width / 2;
            const y1 = height / 2 + Math.sin(angleRad) * height / 2;

            const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
            stops.forEach(stop => gradient.addColorStop(stop.position, stop.color));
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            return;
        }
    }

    if (cssBackground.includes('radial-gradient')) {
        const colorMatches = cssBackground.matchAll(/(#[0-9a-fA-F]{6}|rgb\([^)]+\))\s+(\d+)%/g);
        const stops: { color: string; position: number }[] = [];
        
        for (const match of colorMatches) {
            stops.push({
                color: match[1],
                position: parseInt(match[2]) / 100
            });
        }

        if (stops.length >= 2) {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.max(width, height) / 2;

            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            stops.forEach(stop => gradient.addColorStop(stop.position, stop.color));
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            return;
        }
    }

    if (cssBackground.includes('conic-gradient')) {
        // Parsear: conic-gradient(from {angle}deg at {x}% {y}%, {stops})
        const angleMatch = cssBackground.match(/from\s+(\d+)deg/);
        const positionMatch = cssBackground.match(/at\s+(\d+)%\s+(\d+)%/);
        
        const angle = angleMatch ? parseInt(angleMatch[1]) : 0;
        const originX = positionMatch ? parseInt(positionMatch[1]) / 100 : 0.5;
        const originY = positionMatch ? parseInt(positionMatch[2]) / 100 : 0.5;
        
        const colorMatches = cssBackground.matchAll(/(#[0-9a-fA-F]{6}|rgb\([^)]+\))\s+(\d+)%/g);
        const stops: { color: string; position: number }[] = [];
        
        for (const match of colorMatches) {
            stops.push({
                color: match[1],
                position: parseInt(match[2]) / 100
            });
        }

        if (stops.length >= 2) {
            const centerX = width * originX;
            const centerY = height * originY;
            const startAngle = (angle - 90) * Math.PI / 180; // Convertir a radianes y ajustar para que 0° sea arriba

            const gradient = ctx.createConicGradient(startAngle, centerX, centerY);
            stops.forEach(stop => gradient.addColorStop(stop.position, stop.color));
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            return;
        }
    }

    ctx.fillStyle = '#667eea';
    ctx.fillRect(0, 0, width, height);
}

// Extended zoom state for canvas export including 3D effects
export interface ZoomStateCanvasExport extends ZoomStateCanvas {
    rotateX: number;
    rotateY: number;
    perspective: number;
}

/**
 * Calculate smooth zoom for canvas export.
 * 
 * IMPORTANT: Two different zoom behaviors:
 * 1. Simple zoom (no 3D, no movement): Entry inside fragment, Exit AFTER fragment ends
 * 2. Advanced zoom (3D or movement): 3-phase system (Entry → Hold → Exit) all within fragment
 */
export function calculateSmoothZoom(
    frameTime: number,
    zoomFragments: ZoomFragment[],
    cursorData?: CursorRecordingData
): ZoomStateCanvasExport {
    const DEFAULT_STATE: ZoomStateCanvasExport = {
        scale: 1,
        focusX: 50,
        focusY: 50,
        rotateX: 0,
        rotateY: 0,
        perspective: 0,
    };

    if (!zoomFragments.length) return DEFAULT_STATE;

    const sortedFragments = [...zoomFragments].sort((a, b) => a.startTime - b.startTime);

    const activeFragment = sortedFragments.find(
        (fragment) => frameTime >= fragment.startTime && frameTime <= fragment.endTime
    );

    if (activeFragment) {
        const phaseState = calculateZoomPhaseState(activeFragment, frameTime, true);
        const cursorFrame = activeFragment.followCursor && cursorData?.hasCursorData
            ? interpolateCursorPosition(
                cursorData.keyframes,
                frameTime,
                Math.round((activeFragment.followSmoothing ?? 0.62) * 100)
            )
            : null;
        const followedFocus = calculateCursorFollowFocus(
            activeFragment,
            phaseState.focusX,
            phaseState.focusY,
            cursorFrame
        );

        return {
            scale: phaseState.scale,
            focusX: followedFocus.focusX,
            focusY: followedFocus.focusY,
            rotateX: phaseState.rotateX,
            rotateY: phaseState.rotateY,
            perspective: phaseState.perspective,
        };
    }

    // Natural release after a fragment only when there is a small gap before the next one.
    // This prevents a hard cut if the playhead lands just after the fragment end.
    const previousFragment = sortedFragments
        .filter((fragment) => fragment.endTime < frameTime)
        .sort((a, b) => b.endTime - a.endTime)[0];

    if (!previousFragment) return DEFAULT_STATE;

    const nextFragment = sortedFragments.find(
        (fragment) => fragment.startTime > previousFragment.endTime
    );

    const releaseSeconds = Math.min(
        speedToTransitionMs(previousFragment.speed) / 1000,
        Math.max(0.18, (previousFragment.endTime - previousFragment.startTime) * 0.28)
    );

    const timeSinceEnd = frameTime - previousFragment.endTime;

    if (timeSinceEnd <= 0 || timeSinceEnd > releaseSeconds) return DEFAULT_STATE;

    if (nextFragment && frameTime >= nextFragment.startTime - 0.02) {
        return DEFAULT_STATE;
    }

    const progress = Math.max(0, Math.min(1, timeSinceEnd / releaseSeconds));
    const easedProgress = easeOutQuart(progress);
    const targetScale = zoomLevelToFactor(previousFragment.zoomLevel);
    const scale = targetScale - (targetScale - 1) * easedProgress;

    return {
        scale: scale < 1.002 ? 1 : scale,
        focusX: previousFragment.movementEnabled
            ? previousFragment.movementEndX ?? previousFragment.focusX
            : previousFragment.focusX,
        focusY: previousFragment.movementEnabled
            ? previousFragment.movementEndY ?? previousFragment.focusY
            : previousFragment.focusY,
        rotateX: 0,
        rotateY: 0,
        perspective: 0,
    };
}

// Funciones para determinar esquina más cercana y estilos de las esquinas para rotar elementos
export type Corner = "top-left" | "top-right" | "bottom-right" | "bottom-left";

export function getNearestCorner(e: React.MouseEvent<HTMLElement>, rotationDeg = 0): Corner {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    const rad = (-rotationDeg * Math.PI) / 180;
    const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
    const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

    const isRight = localX > 0;
    const isBottom = localY > 0;
    if (!isRight && !isBottom) return "top-left";
    if (isRight && !isBottom) return "top-right";
    if (isRight && isBottom) return "bottom-right";
    return "bottom-left";
}

export function getCornerStyle(corner: Corner, offset = -10): React.CSSProperties {
    const base: React.CSSProperties = { position: "absolute", zIndex: 20, cursor: "grab" };
    switch (corner) {
        case "top-left":
            return { ...base, top: offset, left: offset };
        case "top-right":
            return { ...base, top: offset, right: offset };
        case "bottom-right":
            return { ...base, bottom: offset, right: offset };
        case "bottom-left":
            return { ...base, bottom: offset, left: offset };
    }
}

export const CORNER_ICON_ROTATION: Record<Corner, number> = {
    "top-right": 0,    // posición natural del SVG
    "bottom-right": 90,   // gira 90° a la derecha
    "bottom-left": 180,  // gira 180°
    "top-left": 270,  // gira 270°
};
