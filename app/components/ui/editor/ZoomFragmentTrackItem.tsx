"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Icon } from "@iconify/react";
import type { ZoomFragment } from "@/types/zoom.types";
import { getZoomModeConfig, zoomLevelToFactor } from "@/types/zoom.types";

const MIN_FRAGMENT_DURATION = 0.5;
const SNAP_THRESHOLD_PX = 8;

interface ZoomFragmentTrackItemProps {
    fragment: ZoomFragment;
    isSelected: boolean;
    contentWidth: number;
    videoDuration: number;
    otherFragments: ZoomFragment[];
    snapTimes?: number[];
    onSelect: () => void;
    onUpdate: (updates: Partial<ZoomFragment>) => void;
    onDragStateChange?: (isDragging: boolean) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function formatDuration(seconds: number): string {
    if (seconds < 10) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

export function ZoomFragmentTrackItem({
    fragment,
    isSelected,
    contentWidth,
    videoDuration,
    otherFragments,
    snapTimes = [],
    onSelect,
    onUpdate,
    onDragStateChange,
    onMouseEnter,
    onMouseLeave,
}: ZoomFragmentTrackItemProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<"start" | "end" | null>(null);
    const [snapX, setSnapX] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const fragmentX = useMotionValue(0);
    const fragmentWidth = useMotionValue(0);

    const duration = fragment.endTime - fragment.startTime;
    const isInteracting = isDragging || isResizing !== null;
    const mode = fragment.cinematicMode ?? "smooth";
    const modeConfig = getZoomModeConfig(mode);
    const zoomFactor = zoomLevelToFactor(fragment.zoomLevel);

    const timeToPixels = useCallback(
        (time: number) => {
            if (videoDuration <= 0) return 0;
            return (time / videoDuration) * contentWidth;
        },
        [videoDuration, contentWidth]
    );

    const pixelsToTime = useCallback(
        (pixels: number) => {
            if (contentWidth <= 0) return 0;
            return (pixels / contentWidth) * videoDuration;
        },
        [contentWidth, videoDuration]
    );

    const initialLeft = timeToPixels(fragment.startTime);
    const initialWidth = timeToPixels(duration);

    useEffect(() => {
        if (!isDragging && !isResizing) {
            fragmentX.set(initialLeft);
            fragmentWidth.set(initialWidth);
        }
    }, [initialLeft, initialWidth, isDragging, isResizing, fragmentX, fragmentWidth]);

    const boundaries = useMemo(() => {
        const sorted = [...otherFragments].sort((a, b) => a.startTime - b.startTime);
        let minStart = 0;
        let maxEnd = videoDuration;

        for (const other of sorted) {
            if (other.endTime <= fragment.startTime) {
                minStart = Math.max(minStart, other.endTime);
            }
            if (other.startTime >= fragment.endTime) {
                maxEnd = Math.min(maxEnd, other.startTime);
                break;
            }
        }

        return { minStart, maxEnd };
    }, [otherFragments, fragment.startTime, fragment.endTime, videoDuration]);

    const snapPoints = useMemo(() => {
        const points = [0, videoDuration];
        for (const item of otherFragments) {
            points.push(item.startTime, item.endTime);
        }
        for (const time of snapTimes) {
            if (Number.isFinite(time)) points.push(time);
        }
        return Array.from(new Set(points)).sort((a, b) => a - b);
    }, [otherFragments, snapTimes, videoDuration]);

    const applySnapping = useCallback(
        (x: number, fragmentDuration: number, disabled: boolean) => {
            if (disabled || !snapPoints.length) {
                setSnapX(null);
                return x;
            }

            let nextX = x;
            let bestDistance = Infinity;
            let bestSnapPx: number | null = null;

            const startTime = pixelsToTime(x);
            const endTime = startTime + fragmentDuration;

            for (const point of snapPoints) {
                const startDistance = Math.abs(timeToPixels(point) - x);
                const endDistance = Math.abs(timeToPixels(point) - timeToPixels(endTime));

                if (startDistance < bestDistance && startDistance <= SNAP_THRESHOLD_PX) {
                    bestDistance = startDistance;
                    nextX = timeToPixels(point);
                    bestSnapPx = timeToPixels(point);
                }

                if (endDistance < bestDistance && endDistance <= SNAP_THRESHOLD_PX) {
                    bestDistance = endDistance;
                    nextX = timeToPixels(point - fragmentDuration);
                    bestSnapPx = timeToPixels(point);
                }
            }

            setSnapX(bestSnapPx);
            return nextX;
        },
        [pixelsToTime, snapPoints, timeToPixels]
    );

    const handleDrag = useCallback(
        (event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
            if (contentWidth === 0 || videoDuration === 0) return;

            const pointerEvent = event as PointerEvent;
            const disableSnap = pointerEvent.altKey;
            const currentX = fragmentX.get();
            let newX = currentX + info.delta.x;

            const minX = timeToPixels(boundaries.minStart);
            const maxX = timeToPixels(boundaries.maxEnd - duration);

            newX = clamp(newX, minX, maxX);
            newX = clamp(applySnapping(newX, duration, disableSnap), minX, maxX);
            fragmentX.set(newX);
        },
        [contentWidth, videoDuration, fragmentX, timeToPixels, boundaries, duration, applySnapping]
    );

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
        onDragStateChange?.(true);
    }, [onDragStateChange]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        setSnapX(null);
        onDragStateChange?.(false);

        const newStartTime = clamp(pixelsToTime(fragmentX.get()), 0, videoDuration);

        onUpdate({
            startTime: newStartTime,
            endTime: clamp(newStartTime + duration, 0, videoDuration),
        });
    }, [fragmentX, pixelsToTime, duration, videoDuration, onUpdate, onDragStateChange]);

    const handleResizeStartDrag = useCallback(
        (event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
            if (contentWidth === 0 || videoDuration === 0) return;

            const pointerEvent = event as PointerEvent;
            const currentX = fragmentX.get();
            const currentWidth = fragmentWidth.get();
            const minWidth = timeToPixels(MIN_FRAGMENT_DURATION);
            const minX = timeToPixels(boundaries.minStart);

            let newX = currentX + info.delta.x;
            let newWidth = currentWidth - info.delta.x;

            if (newWidth < minWidth) {
                newWidth = minWidth;
                newX = currentX + currentWidth - minWidth;
            }

            newX = Math.max(minX, newX);

            const snappedX = applySnapping(newX, pixelsToTime(newWidth), pointerEvent.altKey);
            if (snappedX !== newX) {
                newWidth += newX - snappedX;
                newX = snappedX;
            }

            fragmentX.set(newX);
            fragmentWidth.set(Math.max(minWidth, newWidth));
        },
        [contentWidth, videoDuration, fragmentX, fragmentWidth, boundaries, timeToPixels, pixelsToTime, applySnapping]
    );

    const handleResizeEndDrag = useCallback(
        (event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
            if (contentWidth === 0 || videoDuration === 0) return;

            const pointerEvent = event as PointerEvent;
            const currentX = fragmentX.get();
            const minWidth = timeToPixels(MIN_FRAGMENT_DURATION);
            const maxWidth = timeToPixels(boundaries.maxEnd) - currentX;
            let newWidth = clamp(fragmentWidth.get() + info.delta.x, minWidth, maxWidth);

            if (!pointerEvent.altKey) {
                const endPx = currentX + newWidth;
                let bestDistance = Infinity;
                let bestEndPx: number | null = null;

                for (const point of snapPoints) {
                    const pointPx = timeToPixels(point);
                    const distance = Math.abs(pointPx - endPx);
                    if (distance <= SNAP_THRESHOLD_PX && distance < bestDistance) {
                        bestDistance = distance;
                        bestEndPx = pointPx;
                    }
                }

                if (bestEndPx !== null) {
                    newWidth = clamp(bestEndPx - currentX, minWidth, maxWidth);
                    setSnapX(bestEndPx);
                } else {
                    setSnapX(null);
                }
            }

            fragmentWidth.set(newWidth);
        },
        [contentWidth, videoDuration, fragmentWidth, fragmentX, boundaries, timeToPixels, snapPoints]
    );

    const handleResizeStart = useCallback(
        (handle: "start" | "end") => {
            setIsResizing(handle);
            onDragStateChange?.(true);
        },
        [onDragStateChange]
    );

    const handleResizeEnd = useCallback(() => {
        setIsResizing(null);
        setSnapX(null);
        onDragStateChange?.(false);

        const newStartTime = clamp(pixelsToTime(fragmentX.get()), 0, videoDuration);
        const newEndTime = clamp(pixelsToTime(fragmentX.get() + fragmentWidth.get()), 0, videoDuration);

        onUpdate({
            startTime: newStartTime,
            endTime: Math.max(newStartTime + MIN_FRAGMENT_DURATION, newEndTime),
        });
    }, [fragmentX, fragmentWidth, pixelsToTime, videoDuration, onUpdate, onDragStateChange]);

    return (
        <>
            {snapX !== null && (
                <div
                    className="pointer-events-none absolute top-0 bottom-0 z-[2] w-px bg-blue-300/70 shadow-[0_0_12px_rgba(96,165,250,0.65)]"
                    style={{ left: snapX }}
                />
            )}

            <motion.div
                ref={containerRef}
                className={`absolute top-[9%] h-[82%] select-none overflow-hidden rounded-lg border transition-shadow ${
                    isSelected || isInteracting
                        ? "z-10 cursor-grab border-blue-300/80 shadow-[0_0_22px_rgba(59,130,246,0.45)]"
                        : "z-0 cursor-grab border-blue-500/35 hover:border-blue-400/65"
                } ${isDragging ? "cursor-grabbing" : ""}`}
                style={{
                    x: fragmentX,
                    width: fragmentWidth,
                    background:
                        isSelected || isInteracting
                            ? "linear-gradient(135deg, rgba(59,130,246,0.62), rgba(14,165,233,0.34) 48%, rgba(30,64,175,0.52))"
                            : "linear-gradient(135deg, rgba(37,99,235,0.28), rgba(14,165,233,0.14) 48%, rgba(30,58,138,0.22))",
                    boxShadow:
                        isSelected || isInteracting
                            ? "inset 0 1px 0 rgba(255,255,255,0.28), 0 12px 32px rgba(37,99,235,0.18)"
                            : "inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
                drag="x"
                dragConstraints={{ left: 0, right: contentWidth }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleDrag}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={(event) => {
                    event.stopPropagation();
                    onSelect();
                }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                whileTap={{ scale: 0.985 }}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={videoDuration}
                aria-valuenow={fragment.startTime}
                aria-label={`Zoom fragment ${zoomFactor.toFixed(1)}x, ${duration.toFixed(1)}s`}
                tabIndex={0}
            >
                <div className="absolute inset-0 opacity-50">
                    <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/18 to-transparent" />
                    <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black/18 to-transparent" />
                    {fragment.movementEnabled && (
                        <div className="absolute left-[18%] right-[18%] top-1/2 h-px -translate-y-1/2 bg-blue-100/25">
                            <div className="absolute -left-1 -top-1 size-2 rounded-full bg-blue-100/70" />
                            <div className="absolute -right-1 -top-1 size-2 rounded-full bg-cyan-200/70" />
                        </div>
                    )}
                </div>

                <motion.div
                    className="absolute left-0 top-0 bottom-0 z-20 flex w-3 cursor-ew-resize items-center justify-center group/resize"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0}
                    dragMomentum={false}
                    onDrag={handleResizeStartDrag}
                    onDragStart={() => handleResizeStart("start")}
                    onDragEnd={handleResizeEnd}
                    onClick={(event) => event.stopPropagation()}
                    role="slider"
                    aria-label="Resize zoom start"
                    aria-valuemin={0}
                    aria-valuemax={videoDuration}
                    aria-valuenow={fragment.startTime}
                    tabIndex={0}
                >
                    <div
                        className={`h-7 w-1 rounded-full transition-all ${
                            isResizing === "start"
                                ? "scale-110 bg-white"
                                : "bg-blue-200/65 group-hover/resize:bg-white"
                        }`}
                    />
                </motion.div>

                <div className="pointer-events-none relative z-10 flex h-full min-w-0 flex-1 items-center justify-center px-3">
                    <div className="min-w-0 text-center leading-tight">
                        <div className="flex items-center justify-center gap-1.5">
                            <Icon icon="solar:magnifer-zoom-in-bold" width="13" className="text-blue-100/90" />
                            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-50">
                                Zoom
                            </span>
                        </div>
                        <div className="mt-0.5 truncate text-[9px] font-mono text-blue-100/65">
                            {zoomFactor.toFixed(1)}× · {formatDuration(duration)} · {modeConfig.label}
                        </div>
                    </div>
                </div>

                <motion.div
                    className="absolute right-0 top-0 bottom-0 z-20 flex w-3 cursor-ew-resize items-center justify-center group/resize"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0}
                    dragMomentum={false}
                    onDrag={handleResizeEndDrag}
                    onDragStart={() => handleResizeStart("end")}
                    onDragEnd={handleResizeEnd}
                    onClick={(event) => event.stopPropagation()}
                    role="slider"
                    aria-label="Resize zoom end"
                    aria-valuemin={0}
                    aria-valuemax={videoDuration}
                    aria-valuenow={fragment.endTime}
                    tabIndex={0}
                >
                    <div
                        className={`h-7 w-1 rounded-full transition-all ${
                            isResizing === "end"
                                ? "scale-110 bg-white"
                                : "bg-blue-200/65 group-hover/resize:bg-white"
                        }`}
                    />
                </motion.div>
            </motion.div>
        </>
    );
}

export function canAddFragmentAt(
    startTime: number,
    endTime: number,
    existingFragments: ZoomFragment[],
    excludeFragmentId?: string
): boolean {
    for (const fragment of existingFragments) {
        if (excludeFragmentId && fragment.id === excludeFragmentId) continue;

        const overlaps = startTime < fragment.endTime && endTime > fragment.startTime;
        if (overlaps) return false;
    }
    return true;
}

function findAllGaps(
    existingFragments: ZoomFragment[],
    videoDuration: number,
    minDuration: number
): Array<{ start: number; end: number }> {
    const gaps: Array<{ start: number; end: number }> = [];
    const sorted = [...existingFragments].sort((a, b) => a.startTime - b.startTime);

    if (sorted.length === 0) {
        if (videoDuration >= minDuration) gaps.push({ start: 0, end: videoDuration });
        return gaps;
    }

    if (sorted[0].startTime >= minDuration) gaps.push({ start: 0, end: sorted[0].startTime });

    for (let i = 0; i < sorted.length - 1; i += 1) {
        const gapStart = sorted[i].endTime;
        const gapEnd = sorted[i + 1].startTime;
        if (gapEnd - gapStart >= minDuration) gaps.push({ start: gapStart, end: gapEnd });
    }

    const lastEnd = sorted[sorted.length - 1].endTime;
    if (videoDuration - lastEnd >= minDuration) gaps.push({ start: lastEnd, end: videoDuration });

    return gaps;
}

export function findValidFragmentPosition(
    clickTime: number,
    defaultDuration: number,
    existingFragments: ZoomFragment[],
    videoDuration: number
): { startTime: number; endTime: number } | null {
    const gaps = findAllGaps(existingFragments, videoDuration, defaultDuration);
    if (gaps.length === 0) return null;

    for (const gap of gaps) {
        if (clickTime >= gap.start && clickTime <= gap.end) {
            const halfDuration = defaultDuration / 2;
            let startTime = clickTime - halfDuration;
            let endTime = clickTime + halfDuration;

            if (startTime < gap.start) {
                startTime = gap.start;
                endTime = startTime + defaultDuration;
            }
            if (endTime > gap.end) {
                endTime = gap.end;
                startTime = endTime - defaultDuration;
            }

            return { startTime, endTime };
        }
    }

    let closestGap = gaps[0];
    let closestDistance = Infinity;

    for (const gap of gaps) {
        const gapCenter = (gap.start + gap.end) / 2;
        const distance = Math.abs(clickTime - gapCenter);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestGap = gap;
        }
    }

    if (clickTime <= closestGap.start) {
        return { startTime: closestGap.start, endTime: closestGap.start + defaultDuration };
    }

    if (clickTime >= closestGap.end) {
        return { startTime: closestGap.end - defaultDuration, endTime: closestGap.end };
    }

    return { startTime: closestGap.start, endTime: closestGap.start + defaultDuration };
}
