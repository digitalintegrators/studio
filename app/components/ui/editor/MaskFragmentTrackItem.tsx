"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Icon } from "@iconify/react";
import type { EditableMaskFragment } from "@/types/mask-fragment.types";
import { MASK_PRESET_LABELS } from "@/types/mask-fragment.types";

const MIN_FRAGMENT_DURATION = 0.2;
const SNAP_THRESHOLD_SECONDS = 0.12;

type MaskFragmentTrackItemProps = {
  fragment: EditableMaskFragment;
  isSelected: boolean;
  contentWidth: number;
  videoDuration: number;
  currentTime?: number;
  otherFragments: EditableMaskFragment[];
  snapTimes?: number[];
  onSelect: () => void;
  onUpdate: (updates: Partial<EditableMaskFragment>) => void;
  onDuplicate?: (fragment: EditableMaskFragment) => void;
  onDragStateChange?: (dragging: boolean) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0s";
  const safe = Math.max(0, seconds);
  return safe >= 60
    ? `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`
    : `${safe.toFixed(1)}s`;
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

function isShiftEvent(event: MouseEvent | TouchEvent | PointerEvent): boolean {
  return "shiftKey" in event && Boolean(event.shiftKey);
}

function isAltEvent(event: MouseEvent | TouchEvent | PointerEvent): boolean {
  return "altKey" in event && Boolean(event.altKey);
}

export function MaskFragmentTrackItem({
  fragment,
  isSelected,
  contentWidth,
  videoDuration,
  currentTime = 0,
  otherFragments,
  snapTimes = [],
  onSelect,
  onUpdate,
  onDuplicate,
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
  const didDuplicateOnDragRef = useRef(false);

  const timeToPx = useCallback(
    (time: number) => {
      if (videoDuration <= 0 || contentWidth <= 0) return 0;
      return (time / videoDuration) * contentWidth;
    },
    [videoDuration, contentWidth]
  );

  const pxToTime = useCallback(
    (px: number) => {
      if (contentWidth <= 0 || videoDuration <= 0) return 0;
      return (px / contentWidth) * videoDuration;
    },
    [contentWidth, videoDuration]
  );

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

  const combinedSnapTimes = useMemo(() => {
    const all = [0, videoDuration, currentTime, ...snapTimes];

    otherFragments.forEach((item) => {
      all.push(item.startTime, item.endTime);
    });

    return [...new Set(all.filter((target) => Number.isFinite(target)))].sort((a, b) => a - b);
  }, [currentTime, otherFragments, snapTimes, videoDuration]);

  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      if (contentWidth === 0 || videoDuration === 0) return;

      if (isAltEvent(event) && onDuplicate && !didDuplicateOnDragRef.current) {
        didDuplicateOnDragRef.current = true;
        onDuplicate(fragment);
      }

      let nextX = latestXRef.current + info.delta.x;
      const minX = timeToPx(boundaries.minStart);
      const maxX = timeToPx(boundaries.maxEnd - duration);

      nextX = Math.max(minX, Math.min(maxX, nextX));

      const snappedStart = snapTime(pxToTime(nextX), combinedSnapTimes, isShiftEvent(event));
      nextX = timeToPx(Math.max(boundaries.minStart, Math.min(boundaries.maxEnd - duration, snappedStart)));

      latestXRef.current = nextX;
      x.set(nextX);
    },
    [boundaries, combinedSnapTimes, contentWidth, duration, fragment, onDuplicate, pxToTime, timeToPx, videoDuration, x]
  );

  const handleDragStart = useCallback(() => {
    didDuplicateOnDragRef.current = false;
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

  const handleResizeStart = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      const minWidth = timeToPx(MIN_FRAGMENT_DURATION);
      const currentEnd = pxToTime(latestXRef.current + latestWidthRef.current);
      let nextStart = pxToTime(latestXRef.current + info.delta.x);

      nextStart = snapTime(nextStart, combinedSnapTimes, isShiftEvent(event));
      nextStart = Math.max(boundaries.minStart, Math.min(currentEnd - MIN_FRAGMENT_DURATION, nextStart));

      const nextX = timeToPx(nextStart);
      const nextWidth = Math.max(minWidth, timeToPx(currentEnd - nextStart));

      latestXRef.current = nextX;
      latestWidthRef.current = nextWidth;
      x.set(nextX);
      width.set(nextWidth);
    },
    [boundaries.minStart, combinedSnapTimes, pxToTime, timeToPx, width, x]
  );

  const handleResizeEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      const currentStart = pxToTime(latestXRef.current);
      let nextEnd = pxToTime(latestXRef.current + latestWidthRef.current + info.delta.x);

      nextEnd = snapTime(nextEnd, combinedSnapTimes, isShiftEvent(event));
      nextEnd = Math.max(currentStart + MIN_FRAGMENT_DURATION, Math.min(boundaries.maxEnd, nextEnd));

      const nextWidth = timeToPx(nextEnd - currentStart);
      latestWidthRef.current = nextWidth;
      width.set(nextWidth);
    },
    [boundaries.maxEnd, combinedSnapTimes, pxToTime, timeToPx, width]
  );

  const handleResizeDragStart = useCallback(
    (side: "start" | "end") => {
      setIsResizing(side);
      onDragStateChange?.(true);
      onSelect();
    },
    [onDragStateChange, onSelect]
  );

  const handleResizeDragEnd = useCallback(() => {
    setIsResizing(null);
    onDragStateChange?.(false);

    const nextStart = Math.max(0, pxToTime(latestXRef.current));
    const nextDuration = Math.max(MIN_FRAGMENT_DURATION, pxToTime(latestWidthRef.current));
    onUpdate({ startTime: nextStart, endTime: Math.min(videoDuration, nextStart + nextDuration) });
  }, [onDragStateChange, onUpdate, pxToTime, videoDuration]);

  const preset = fragment.preset ?? "blur";
  const label = MASK_PRESET_LABELS[preset] ?? fragment.label ?? "Máscara";
  const isInteracting = isDragging || isResizing !== null;

  return (
    <motion.div
      className={`absolute top-[12%] h-[76%] cursor-grab overflow-hidden rounded-lg border shadow-[0_0_18px_rgba(217,70,239,0.18)] active:cursor-grabbing ${
        isSelected
          ? "z-20 border-fuchsia-200 ring-2 ring-fuchsia-300/35"
          : "z-10 border-fuchsia-400/45 hover:border-fuchsia-300/70"
      }`}
      style={{
        x,
        width,
        background:
          preset === "highlight"
            ? "linear-gradient(180deg, rgba(250,204,21,0.22), rgba(217,70,239,0.16))"
            : preset === "dim"
              ? "linear-gradient(180deg, rgba(30,41,59,0.55), rgba(15,23,42,0.35))"
              : preset === "pixelate"
                ? "linear-gradient(180deg, rgba(6,182,212,0.18), rgba(217,70,239,0.18))"
                : "linear-gradient(180deg, rgba(217,70,239,0.24), rgba(126,34,206,0.18))",
      }}
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
      whileTap={{ scale: 0.985 }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]" />
      {isInteracting && <div className="absolute inset-y-0 left-1/2 w-px bg-fuchsia-200/55" />}

      <div className="absolute inset-0 flex items-center justify-center px-2">
        <span className="flex max-w-full items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-50 backdrop-blur-sm">
          <Icon icon={preset === "pixelate" ? "solar:widget-6-bold" : "solar:mask-happly-bold"} width="12" />
          <span className="truncate">{fragment.label ?? label}</span>
          <span className="font-mono text-fuchsia-100/65">{formatDuration(duration)}</span>
        </span>
      </div>

      <motion.div
        className="absolute left-0 top-0 bottom-0 z-30 flex w-3 cursor-ew-resize items-center justify-center group/resize"
        drag="x"
        dragElastic={0}
        dragMomentum={false}
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={handleResizeStart}
        onDragStart={() => handleResizeDragStart("start")}
        onDragEnd={handleResizeDragEnd}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`h-7 w-1.5 rounded-full transition ${isResizing === "start" ? "bg-fuchsia-100 scale-110" : "bg-fuchsia-300/80 group-hover/resize:bg-fuchsia-100"}`} />
      </motion.div>

      <motion.div
        className="absolute right-0 top-0 bottom-0 z-30 flex w-3 cursor-ew-resize items-center justify-center group/resize"
        drag="x"
        dragElastic={0}
        dragMomentum={false}
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={handleResizeEnd}
        onDragStart={() => handleResizeDragStart("end")}
        onDragEnd={handleResizeDragEnd}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`h-7 w-1.5 rounded-full transition ${isResizing === "end" ? "bg-fuchsia-100 scale-110" : "bg-fuchsia-300/80 group-hover/resize:bg-fuchsia-100"}`} />
      </motion.div>
    </motion.div>
  );
}
