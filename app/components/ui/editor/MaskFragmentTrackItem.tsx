"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Icon } from "@iconify/react";
import type { EditableMaskFragment } from "@/types/mask-fragment.types";

const MIN_FRAGMENT_DURATION = 0.2;

type MaskFragmentTrackItemProps = {
  fragment: EditableMaskFragment;
  isSelected: boolean;
  contentWidth: number;
  videoDuration: number;
  otherFragments: EditableMaskFragment[];
  onSelect: () => void;
  onUpdate: (updates: Partial<EditableMaskFragment>) => void;
  onDragStateChange?: (dragging: boolean) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0s";
  const safe = Math.max(0, seconds);
  return safe >= 60
    ? `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`
    : `${Math.round(safe)}s`;
}

export function MaskFragmentTrackItem({
  fragment,
  isSelected,
  contentWidth,
  videoDuration,
  otherFragments,
  onSelect,
  onUpdate,
  onDragStateChange,
  onMouseEnter,
  onMouseLeave,
}: MaskFragmentTrackItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<"start" | "end" | null>(null);
  const x = useMotionValue(0);
  const width = useMotionValue(0);
  const latestXRef = useRef(0);
  const latestWidthRef = useRef(0);

  const timeToPx = useCallback((time: number) => {
    if (videoDuration <= 0 || contentWidth <= 0) return 0;
    return (time / videoDuration) * contentWidth;
  }, [videoDuration, contentWidth]);

  const pxToTime = useCallback((px: number) => {
    if (contentWidth <= 0 || videoDuration <= 0) return 0;
    return (px / contentWidth) * videoDuration;
  }, [contentWidth, videoDuration]);

  const duration = Math.max(MIN_FRAGMENT_DURATION, fragment.endTime - fragment.startTime);
  const initialX = timeToPx(fragment.startTime);
  const initialWidth = timeToPx(duration);

  useEffect(() => {
    if (!isDragging && !isResizing) {
      x.set(initialX);
      width.set(initialWidth);
      latestXRef.current = initialX;
      latestWidthRef.current = initialWidth;
    }
  }, [initialX, initialWidth, isDragging, isResizing, x, width]);

  const boundaries = useMemo(() => {
    const sorted = [...otherFragments].sort((a, b) => a.startTime - b.startTime);
    let minStart = 0;
    let maxEnd = videoDuration;

    for (const other of sorted) {
      if (other.endTime <= fragment.startTime) minStart = Math.max(minStart, other.endTime);
      if (other.startTime >= fragment.endTime) {
        maxEnd = Math.min(maxEnd, other.startTime);
        break;
      }
    }

    return { minStart, maxEnd };
  }, [otherFragments, fragment.startTime, fragment.endTime, videoDuration]);

  const handleDrag = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
    const nextX = Math.max(
      timeToPx(boundaries.minStart),
      Math.min(timeToPx(boundaries.maxEnd - duration), latestXRef.current + info.delta.x)
    );

    latestXRef.current = nextX;
    x.set(nextX);
  }, [boundaries, duration, timeToPx, x]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onDragStateChange?.(true);
    onSelect();
  }, [onDragStateChange, onSelect]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onDragStateChange?.(false);

    const nextStart = Math.max(0, pxToTime(latestXRef.current));
    onUpdate({ startTime: nextStart, endTime: Math.min(videoDuration, nextStart + duration) });
  }, [duration, onDragStateChange, onUpdate, pxToTime, videoDuration]);

  const handleResizeStart = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
    const minWidth = timeToPx(MIN_FRAGMENT_DURATION);
    const currentX = latestXRef.current;
    const currentWidth = latestWidthRef.current;

    let nextX = currentX + info.delta.x;
    let nextWidth = currentWidth - info.delta.x;
    const minX = timeToPx(boundaries.minStart);

    if (nextWidth < minWidth) {
      nextWidth = minWidth;
      nextX = currentX + currentWidth - minWidth;
    }

    if (nextX < minX) {
      nextWidth -= minX - nextX;
      nextX = minX;
    }

    latestXRef.current = nextX;
    latestWidthRef.current = nextWidth;
    x.set(nextX);
    width.set(nextWidth);
  }, [boundaries.minStart, timeToPx, width, x]);

  const handleResizeEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
    const minWidth = timeToPx(MIN_FRAGMENT_DURATION);
    const maxEndX = timeToPx(boundaries.maxEnd);
    const nextWidth = Math.max(minWidth, Math.min(maxEndX - latestXRef.current, latestWidthRef.current + info.delta.x));

    latestWidthRef.current = nextWidth;
    width.set(nextWidth);
  }, [boundaries.maxEnd, timeToPx, width]);

  const handleResizeDragStart = useCallback((side: "start" | "end") => {
    setIsResizing(side);
    onDragStateChange?.(true);
    onSelect();
  }, [onDragStateChange, onSelect]);

  const handleResizeDragEnd = useCallback(() => {
    setIsResizing(null);
    onDragStateChange?.(false);

    const nextStart = Math.max(0, pxToTime(latestXRef.current));
    const nextDuration = Math.max(MIN_FRAGMENT_DURATION, pxToTime(latestWidthRef.current));
    onUpdate({ startTime: nextStart, endTime: Math.min(videoDuration, nextStart + nextDuration) });
  }, [onDragStateChange, onUpdate, pxToTime, videoDuration]);

  return (
    <motion.div
      className={`absolute top-[14%] h-[72%] cursor-grab overflow-hidden rounded-md border bg-fuchsia-500/20 shadow-[0_0_18px_rgba(217,70,239,0.2)] active:cursor-grabbing ${
        isSelected ? "z-20 border-fuchsia-300 ring-2 ring-fuchsia-300/35" : "z-10 border-fuchsia-400/50"
      }`}
      style={{ x, width }}
      drag="x"
      dragElastic={0}
      dragMomentum={false}
      dragConstraints={{ left: 0, right: contentWidth }}
      onDrag={handleDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-300/20 via-fuchsia-500/20 to-fuchsia-900/20" />

      <div className="absolute inset-0 flex items-center justify-center px-2">
        <span className="flex max-w-full items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-100 backdrop-blur-sm">
          <Icon icon="solar:mask-happly-bold" width="12" />
          <span className="truncate">{fragment.label ?? "Máscara"}</span>
          <span className="font-mono text-fuchsia-100/70">{formatDuration(duration)}</span>
        </span>
      </div>

      <motion.div
        className="absolute left-0 top-0 bottom-0 z-30 flex w-2 cursor-ew-resize items-center justify-center"
        drag="x"
        dragElastic={0}
        dragMomentum={false}
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={handleResizeStart}
        onDragStart={() => handleResizeDragStart("start")}
        onDragEnd={handleResizeDragEnd}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`h-7 w-1 rounded-full ${isResizing === "start" ? "bg-fuchsia-200" : "bg-fuchsia-300/75"}`} />
      </motion.div>

      <motion.div
        className="absolute right-0 top-0 bottom-0 z-30 flex w-2 cursor-ew-resize items-center justify-center"
        drag="x"
        dragElastic={0}
        dragMomentum={false}
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={handleResizeEnd}
        onDragStart={() => handleResizeDragStart("end")}
        onDragEnd={handleResizeDragEnd}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`h-7 w-1 rounded-full ${isResizing === "end" ? "bg-fuchsia-200" : "bg-fuchsia-300/75"}`} />
      </motion.div>
    </motion.div>
  );
}
