"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import type { SpotlightFragment } from "@/types/spotlight.types";
import { Icon } from "@iconify/react";

const MIN_FRAGMENT_DURATION = 0.2;
const SNAP_THRESHOLD_SECONDS = 0.12;

interface SpotlightFragmentTrackItemProps {
  fragment: SpotlightFragment;
  isSelected: boolean;
  contentWidth: number;
  videoDuration: number;
  currentTime: number;
  otherFragments: SpotlightFragment[];
  snapTimes?: number[];
  onSelect: () => void;
  onUpdate: (updates: Partial<SpotlightFragment>) => void;
  onDragStateChange?: (dragging: boolean) => void;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

function snapTime(value: number, targets: number[], disabled: boolean): number {
  if (disabled) return value;

  for (const target of targets) {
    if (Math.abs(value - target) <= SNAP_THRESHOLD_SECONDS) {
      return target;
    }
  }

  return value;
}

export function SpotlightFragmentTrackItem({
  fragment,
  isSelected,
  contentWidth,
  videoDuration,
  currentTime,
  otherFragments,
  snapTimes = [],
  onSelect,
  onUpdate,
  onDragStateChange,
}: SpotlightFragmentTrackItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<"start" | "end" | null>(null);
  const x = useMotionValue(0);
  const width = useMotionValue(0);

  const duration = Math.max(MIN_FRAGMENT_DURATION, fragment.endTime - fragment.startTime);

  const timeToPixels = useCallback(
    (time: number) => {
      if (videoDuration <= 0) return 0;
      return (time / videoDuration) * contentWidth;
    },
    [contentWidth, videoDuration]
  );

  const pixelsToTime = useCallback(
    (pixels: number) => {
      if (contentWidth <= 0) return 0;
      return (pixels / contentWidth) * videoDuration;
    },
    [contentWidth, videoDuration]
  );

  const snapTargets = useMemo(() => {
    const targets = [0, videoDuration, currentTime, ...snapTimes];

    otherFragments.forEach((item) => {
      targets.push(item.startTime, item.endTime);
    });

    return targets.filter((target) => Number.isFinite(target));
  }, [currentTime, otherFragments, snapTimes, videoDuration]);

  useEffect(() => {
    if (isDragging || isResizing) return;

    x.set(timeToPixels(fragment.startTime));
    width.set(timeToPixels(duration));
  }, [duration, fragment.startTime, isDragging, isResizing, timeToPixels, width, x]);

  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      if (contentWidth <= 0 || videoDuration <= 0) return;

      const disabledSnap = event instanceof MouseEvent && event.shiftKey;
      let nextX = x.get() + info.delta.x;
      const maxX = contentWidth - timeToPixels(duration);

      nextX = Math.max(0, Math.min(maxX, nextX));

      const nextStart = snapTime(pixelsToTime(nextX), snapTargets, disabledSnap);
      x.set(timeToPixels(nextStart));
    },
    [contentWidth, duration, pixelsToTime, snapTargets, timeToPixels, videoDuration, x]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onDragStateChange?.(false);

    const nextStart = Math.max(0, Math.min(videoDuration - duration, pixelsToTime(x.get())));

    onUpdate({
      startTime: nextStart,
      endTime: nextStart + duration,
    });
  }, [duration, onDragStateChange, onUpdate, pixelsToTime, videoDuration, x]);

  const handleResizeStart = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      if (contentWidth <= 0 || videoDuration <= 0) return;

      const disabledSnap = event instanceof MouseEvent && event.shiftKey;
      const currentEnd = pixelsToTime(x.get() + width.get());
      let nextStart = pixelsToTime(x.get() + info.delta.x);

      nextStart = snapTime(nextStart, snapTargets, disabledSnap);
      nextStart = Math.max(0, Math.min(currentEnd - MIN_FRAGMENT_DURATION, nextStart));

      x.set(timeToPixels(nextStart));
      width.set(timeToPixels(currentEnd - nextStart));
    },
    [contentWidth, pixelsToTime, snapTargets, timeToPixels, videoDuration, width, x]
  );

  const handleResizeEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      if (contentWidth <= 0 || videoDuration <= 0) return;

      const disabledSnap = event instanceof MouseEvent && event.shiftKey;
      const currentStart = pixelsToTime(x.get());
      let nextEnd = pixelsToTime(x.get() + width.get() + info.delta.x);

      nextEnd = snapTime(nextEnd, snapTargets, disabledSnap);
      nextEnd = Math.max(currentStart + MIN_FRAGMENT_DURATION, Math.min(videoDuration, nextEnd));

      width.set(timeToPixels(nextEnd - currentStart));
    },
    [contentWidth, pixelsToTime, snapTargets, timeToPixels, videoDuration, width, x]
  );

  const handleResizeCommit = useCallback(() => {
    setIsResizing(null);
    onDragStateChange?.(false);

    const nextStart = pixelsToTime(x.get());
    const nextEnd = pixelsToTime(x.get() + width.get());

    onUpdate({
      startTime: Math.max(0, nextStart),
      endTime: Math.min(videoDuration, Math.max(nextStart + MIN_FRAGMENT_DURATION, nextEnd)),
    });
  }, [onDragStateChange, onUpdate, pixelsToTime, videoDuration, width, x]);

  return (
    <motion.div
      className={`absolute top-[16%] h-[68%] rounded-md cursor-grab active:cursor-grabbing overflow-hidden border ${
        isSelected
          ? "border-amber-300 ring-1 ring-amber-300/70 shadow-[0_0_16px_rgba(251,191,36,0.35)]"
          : "border-amber-400/40"
      } bg-amber-500/18 backdrop-blur-sm`}
      style={{ x, width }}
      drag="x"
      dragConstraints={{ left: 0, right: contentWidth }}
      dragElastic={0}
      dragMomentum={false}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onDrag={handleDrag}
      onDragStart={() => {
        setIsDragging(true);
        onDragStateChange?.(true);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-yellow-300/20 to-amber-400/10" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="flex items-center gap-1.5 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-amber-100 shadow-sm">
          <Icon icon="solar:spotlight-bold" width="12" />
          <span className="truncate max-w-24">{fragment.label || "Spotlight"}</span>
          <span className="font-mono text-amber-100/60">{formatTime(duration)}</span>
        </span>
      </div>

      <motion.div
        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-center"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDrag={handleResizeStart}
        onDragStart={() => {
          setIsResizing("start");
          onDragStateChange?.(true);
        }}
        onDragEnd={handleResizeCommit}
      >
        <div className={`h-6 w-1 rounded-full ${isResizing === "start" ? "bg-amber-200" : "bg-amber-300/80"}`} />
      </motion.div>

      <motion.div
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-center"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDrag={handleResizeEnd}
        onDragStart={() => {
          setIsResizing("end");
          onDragStateChange?.(true);
        }}
        onDragEnd={handleResizeCommit}
      >
        <div className={`h-6 w-1 rounded-full ${isResizing === "end" ? "bg-amber-200" : "bg-amber-300/80"}`} />
      </motion.div>
    </motion.div>
  );
}
