"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Icon } from "@iconify/react";
import {
    AudioFragmentTrackItemProps,
    MIN_FRAGMENT_DURATION,
    MIN_VISUAL_WIDTH_PX,
} from "@/types/audio.types";
import { formatTime } from "@/lib/video.utils";

const WAVEFORM_BARS = 64;

function generateWaveformBars(seed: string, count: number) {
    let hash = 0;

    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }

    return Array.from({ length: count }, (_, index) => {
        const value = Math.abs(
            Math.sin(index * 0.72 + hash * 0.0009) *
                Math.cos(index * 0.19 + hash * 0.0003)
        );

        return Math.max(18, Math.min(100, Math.round(24 + value * 76)));
    });
}

export function AudioFragmentTrackItem({
    track,
    audio,
    isSelected,
    contentWidth,
    videoDuration,
    otherTracks,
    onSelect,
    onUpdate,
    onDragStateChange,
    onMouseEnter,
    onMouseLeave,
}: AudioFragmentTrackItemProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<"start" | "end" | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const fragmentX = useMotionValue(0);
    const fragmentWidth = useMotionValue(0);

    const isInteracting = isDragging || isResizing !== null;

    const timeToPixels = useCallback(
        (time: number) => {
            if (videoDuration === 0) return 0;
            return (time / videoDuration) * contentWidth;
        },
        [videoDuration, contentWidth]
    );

    const pixelsToTime = useCallback(
        (pixels: number) => {
            if (contentWidth === 0) return 0;
            return (pixels / contentWidth) * videoDuration;
        },
        [contentWidth, videoDuration]
    );

    const initialLeft = timeToPixels(track.startTime);
    const initialWidth = timeToPixels(track.duration);
    const visualWidth = Math.max(initialWidth, MIN_VISUAL_WIDTH_PX);

    const waveformBars = useMemo(() => {
        return generateWaveformBars(
            `${track.id}-${audio?.name ?? track.name ?? "audio"}`,
            WAVEFORM_BARS
        );
    }, [track.id, track.name, audio?.name]);

    const durationLabel = useMemo(() => {
        return formatTime(track.duration);
    }, [track.duration]);

    const volumePercent = useMemo(() => {
        return Math.round((track.volume ?? 1) * 100);
    }, [track.volume]);

    useEffect(() => {
        if (!isDragging && !isResizing) {
            fragmentX.set(initialLeft);
            fragmentWidth.set(visualWidth);
        }
    }, [
        initialLeft,
        visualWidth,
        isDragging,
        isResizing,
        fragmentX,
        fragmentWidth,
    ]);

    const boundaries = useMemo(() => {
        const sorted = [...otherTracks]
            .filter((item) => item.id !== track.id)
            .sort((a, b) => a.startTime - b.startTime);

        let minStart = 0;
        let maxEnd = videoDuration;

        for (const other of sorted) {
            const otherEnd = other.startTime + other.duration;
            const trackEnd = track.startTime + track.duration;

            if (otherEnd <= track.startTime) {
                minStart = Math.max(minStart, otherEnd);
            }

            if (other.startTime >= trackEnd) {
                maxEnd = Math.min(maxEnd, other.startTime);
                break;
            }
        }

        return { minStart, maxEnd };
    }, [otherTracks, track.id, track.startTime, track.duration, videoDuration]);

    const handleDrag = useCallback(
        (
            _event: MouseEvent | TouchEvent | PointerEvent,
            info: { delta: { x: number } }
        ) => {
            if (contentWidth === 0 || videoDuration === 0) return;

            const currentX = fragmentX.get();
            let newX = currentX + info.delta.x;

            const minX = timeToPixels(boundaries.minStart);
            const maxX = timeToPixels(boundaries.maxEnd - track.duration);

            newX = Math.max(minX, Math.min(maxX, newX));
            fragmentX.set(newX);
        },
        [
            contentWidth,
            videoDuration,
            fragmentX,
            track.duration,
            boundaries,
            timeToPixels,
        ]
    );

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
        onDragStateChange?.(true);
    }, [onDragStateChange]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        onDragStateChange?.(false);

        const newStartTime = pixelsToTime(fragmentX.get());

        onUpdate({
            startTime: Math.max(
                0,
                Math.min(videoDuration - track.duration, newStartTime)
            ),
        });
    }, [
        fragmentX,
        pixelsToTime,
        track.duration,
        videoDuration,
        onUpdate,
        onDragStateChange,
    ]);

    const handleResizeStartDrag = useCallback(
        (
            _event: MouseEvent | TouchEvent | PointerEvent,
            info: { delta: { x: number } }
        ) => {
            if (contentWidth === 0 || videoDuration === 0) return;

            const currentX = fragmentX.get();
            const currentWidth = fragmentWidth.get();

            let newX = currentX + info.delta.x;
            let newWidth = currentWidth - info.delta.x;

            const minWidth = timeToPixels(MIN_FRAGMENT_DURATION);

            if (newWidth < minWidth) {
                newWidth = minWidth;
                newX = currentX + currentWidth - minWidth;
            }

            const minX = timeToPixels(boundaries.minStart);

            if (newX < minX) {
                newWidth = newWidth - (minX - newX);
                newX = minX;
            }

            if (audio) {
                const maxWidth = timeToPixels(audio.duration);

                if (newWidth > maxWidth) {
                    const diff = newWidth - maxWidth;
                    newX = newX + diff;
                    newWidth = maxWidth;
                }
            }

            fragmentX.set(newX);
            fragmentWidth.set(newWidth);
        },
        [
            contentWidth,
            videoDuration,
            fragmentX,
            fragmentWidth,
            boundaries,
            timeToPixels,
            audio,
        ]
    );

    const handleResizeEndDrag = useCallback(
        (
            _event: MouseEvent | TouchEvent | PointerEvent,
            info: { delta: { x: number } }
        ) => {
            if (contentWidth === 0 || videoDuration === 0) return;

            const currentX = fragmentX.get();
            const currentWidth = fragmentWidth.get();

            let newWidth = currentWidth + info.delta.x;

            const minWidth = timeToPixels(MIN_FRAGMENT_DURATION);
            newWidth = Math.max(minWidth, newWidth);

            const maxWidth = timeToPixels(boundaries.maxEnd) - currentX;
            newWidth = Math.min(newWidth, maxWidth);

            if (audio) {
                newWidth = Math.min(newWidth, timeToPixels(audio.duration));
            }

            fragmentWidth.set(newWidth);
        },
        [
            contentWidth,
            videoDuration,
            fragmentWidth,
            fragmentX,
            boundaries,
            timeToPixels,
            audio,
        ]
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
        onDragStateChange?.(false);

        const newStartTime = pixelsToTime(fragmentX.get());
        const newDuration = pixelsToTime(fragmentWidth.get());

        onUpdate({
            startTime: Math.max(0, newStartTime),
            duration: Math.min(audio?.duration ?? videoDuration, newDuration),
        });
    }, [
        fragmentX,
        fragmentWidth,
        pixelsToTime,
        audio,
        videoDuration,
        onUpdate,
        onDragStateChange,
    ]);

    return (
        <motion.div
            ref={containerRef}
            className={`absolute top-1/2 h-8 -translate-y-1/2 cursor-grab overflow-hidden rounded-xl border transition-all active:cursor-grabbing ${
                isSelected
                    ? "z-20 border-cyan-300/70 bg-cyan-400/20 shadow-[0_0_28px_rgba(34,211,238,0.24)]"
                    : "z-0 border-cyan-300/15 bg-cyan-400/10 shadow-[0_8px_22px_rgba(0,0,0,0.28)] hover:border-cyan-300/35 hover:bg-cyan-400/15"
            } ${isInteracting ? "z-30 scale-[1.01]" : ""}`}
            style={{ x: fragmentX, width: fragmentWidth }}
            drag="x"
            dragConstraints={{ left: 0, right: contentWidth }}
            dragElastic={0}
            dragMomentum={false}
            onDrag={handleDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={(event) => {
                event.stopPropagation();
                onSelect();
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.24),rgba(6,182,212,0.12),rgba(99,102,241,0.14))]" />

            <div className="absolute inset-0 opacity-70">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_35%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
            </div>

            <div className="relative z-10 flex h-full items-center gap-2 px-2">
                <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border ${
                        isSelected
                            ? "border-cyan-200/50 bg-white/15 text-cyan-100"
                            : "border-white/10 bg-black/20 text-cyan-200/70"
                    }`}
                >
                    <Icon icon="solar:music-note-2-bold" width="13" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-semibold tracking-tight text-white/90">
                            {track.name || audio?.name || "Audio track"}
                        </span>

                        <span className="shrink-0 rounded-full bg-black/25 px-1.5 py-0.5 text-[8px] font-bold text-cyan-100/80">
                            {durationLabel}
                        </span>
                    </div>

                    <div className="flex h-2.5 items-center gap-[2px] overflow-hidden">
                        {waveformBars.map((height, index) => (
                            <span
                                key={`${track.id}-wave-${index}`}
                                className={`w-[2px] shrink-0 rounded-full ${
                                    isSelected ? "bg-cyan-100/90" : "bg-cyan-100/55"
                                }`}
                                style={{
                                    height: `${height}%`,
                                    opacity:
                                        index % 5 === 0
                                            ? 0.95
                                            : index % 3 === 0
                                              ? 0.75
                                              : 0.55,
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="hidden shrink-0 items-center gap-1 rounded-full bg-black/20 px-1.5 py-0.5 text-[8px] font-bold text-white/60 sm:flex">
                    <Icon icon="solar:volume-loud-bold" width="10" />
                    {volumePercent}%
                </div>
            </div>

            <div
                className={`absolute bottom-0 left-0 h-[2px] rounded-full ${
                    isSelected ? "bg-cyan-200" : "bg-cyan-300/60"
                }`}
                style={{ width: `${Math.max(8, volumePercent)}%` }}
            />

            <motion.div
                className="absolute left-0 top-0 z-20 flex h-full w-3 cursor-ew-resize items-center justify-center"
                animate={{ opacity: isHovered || isResizing === "start" ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleResizeStartDrag}
                onDragStart={(event) => {
                    event.stopPropagation();
                    handleResizeStart("start");
                }}
                onDragEnd={handleResizeEnd}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="h-5 w-1 rounded-full border border-white/40 bg-white shadow-[0_0_12px_rgba(255,255,255,0.35)]" />
            </motion.div>

            <motion.div
                className="absolute right-0 top-0 z-20 flex h-full w-3 cursor-ew-resize items-center justify-center"
                animate={{ opacity: isHovered || isResizing === "end" ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleResizeEndDrag}
                onDragStart={(event) => {
                    event.stopPropagation();
                    handleResizeStart("end");
                }}
                onDragEnd={handleResizeEnd}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="h-5 w-1 rounded-full border border-white/40 bg-white shadow-[0_0_12px_rgba(255,255,255,0.35)]" />
            </motion.div>
        </motion.div>
    );
}