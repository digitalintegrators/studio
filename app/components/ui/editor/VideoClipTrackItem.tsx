"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import type { VideoTrackClip } from "@/types/video-track.types";
import { Icon } from "@iconify/react";

const MIN_CLIP_DURATION = 0.1;
const DB_NAME = "openvidDB";
const VIDEO_STORE_NAME = "videos";
const DB_VERSION = 3;

interface VideoClipTrackItemProps {
  clip: VideoTrackClip;
  isSelected: boolean;
  contentWidth: number;
  totalDuration: number;
  otherClips: VideoTrackClip[];
  currentTime?: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<VideoTrackClip>) => void;
  onDelete?: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
  zoomLevel: number;
  playheadX: MotionValue<number>;
}

type VideoRecord = {
  blob?: Blob;
  videoId?: string;
  duration?: number;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

async function getVideoBlobFromIndexedDB(videoId: string): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) {
        db.createObjectStore(VIDEO_STORE_NAME);
      }
    };

    request.onerror = () => resolve(null);

    request.onsuccess = () => {
      const db = request.result;

      try {
        const transaction = db.transaction([VIDEO_STORE_NAME], "readonly");
        const store = transaction.objectStore(VIDEO_STORE_NAME);
        const getRequest = store.get(videoId);

        getRequest.onsuccess = () => {
          const data = getRequest.result as VideoRecord | undefined;
          db.close();
          resolve(data?.blob ?? null);
        };

        getRequest.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    };
  });
}

async function generateVideoThumbnails(params: {
  videoUrl: string;
  duration: number;
  count?: number;
}): Promise<string[]> {
  const { videoUrl, duration, count = 10 } = params;

  if (!videoUrl || duration <= 0) return [];

  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve([]);
      return;
    }

    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    const thumbnails: string[] = [];
    const safeCount = Math.max(3, Math.min(count, 18));
    const interval = duration / safeCount;
    let index = 0;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    const capture = () => {
      try {
        const width = video.videoWidth || 320;
        const height = video.videoHeight || 180;

        canvas.width = 180;
        canvas.height = Math.max(80, Math.round((height / width) * 180));

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        thumbnails.push(canvas.toDataURL("image/jpeg", 0.68));
      } catch {
        // ignore frame failures
      }

      index += 1;

      if (index >= safeCount) {
        cleanup();
        resolve(thumbnails);
        return;
      }

      const nextTime = Math.min(duration - 0.05, Math.max(0, index * interval));
      video.currentTime = nextTime;
    };

    video.onloadedmetadata = () => {
      const firstTime = Math.min(0.05, Math.max(0, duration - 0.05));
      video.currentTime = firstTime;
    };

    video.onseeked = capture;

    video.onerror = () => {
      cleanup();
      resolve([]);
    };
  });
}

async function generateWaveformPeaks(params: {
  blob: Blob;
  samples?: number;
}): Promise<number[]> {
  const { blob, samples = 96 } = params;

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtx) return [];

    const audioContext = new AudioCtx();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    await audioContext.close().catch(() => undefined);

    if (audioBuffer.numberOfChannels === 0) return [];

    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channelData.length / samples));
    const peaks: number[] = [];

    for (let i = 0; i < samples; i += 1) {
      const start = i * blockSize;
      let sum = 0;

      for (let j = 0; j < blockSize; j += 1) {
        const value = channelData[start + j] ?? 0;
        sum += value * value;
      }

      const rms = Math.sqrt(sum / blockSize);
      peaks.push(rms);
    }

    const max = Math.max(...peaks, 0.001);

    return peaks.map((peak) => Math.min(1, peak / max));
  } catch {
    return [];
  }
}

export function VideoClipTrackItem({
  clip,
  isSelected,
  contentWidth,
  totalDuration,
  otherClips,
  onSelect,
  onUpdate,
  onDragStateChange,
  zoomLevel,
  playheadX,
}: VideoClipTrackItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<"start" | "end" | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const clipX = useMotionValue(0);
  const clipWidth = useMotionValue(0);

  const clipDuration = clip.trimEnd - clip.trimStart;
  const isInteracting = isDragging || isResizing !== null;

  const timeToPixels = useCallback(
    (time: number) => {
      if (totalDuration === 0) return 0;
      return (time / totalDuration) * contentWidth;
    },
    [totalDuration, contentWidth]
  );

  const pixelsToTime = useCallback(
    (pixels: number) => {
      if (contentWidth === 0) return 0;
      return (pixels / contentWidth) * totalDuration;
    },
    [contentWidth, totalDuration]
  );

  const initialLeft = timeToPixels(clip.startTime);
  const initialWidth = timeToPixels(clipDuration);

  const progressWidth = useTransform(playheadX, (px) => {
    const clipStartPx = timeToPixels(clip.startTime);
    const clipEndPx = timeToPixels(clip.startTime + clipDuration);

    if (px <= clipStartPx) return 0;
    if (px >= clipEndPx) return timeToPixels(clipDuration);

    return px - clipStartPx;
  });

  useEffect(() => {
    if (!isDragging && !isResizing) {
      clipX.set(initialLeft);
      clipWidth.set(initialWidth);
    }
  }, [initialLeft, initialWidth, isDragging, isResizing, clipX, clipWidth]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const loadMediaPreview = async () => {
      setIsGeneratingMedia(true);
      setThumbnails([]);
      setWaveformPeaks([]);

      const blob = await getVideoBlobFromIndexedDB(clip.libraryVideoId);

      if (!blob || cancelled) {
        setIsGeneratingMedia(false);
        return;
      }

      objectUrl = URL.createObjectURL(blob);

      if (!cancelled) {
        setVideoObjectUrl(objectUrl);
      }

      const [generatedThumbnails, generatedWaveform] = await Promise.all([
        generateVideoThumbnails({
          videoUrl: objectUrl,
          duration: clip.duration,
          count: Math.max(6, Math.ceil(zoomLevel * 4)),
        }),
        generateWaveformPeaks({
          blob,
          samples: Math.max(72, Math.ceil(zoomLevel * 48)),
        }),
      ]);

      if (!cancelled) {
        setThumbnails(generatedThumbnails);
        setWaveformPeaks(generatedWaveform);
        setIsGeneratingMedia(false);
      }
    };

    loadMediaPreview();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [clip.libraryVideoId, clip.duration, zoomLevel]);

  const boundaries = useMemo(() => {
    const sorted = [...otherClips]
      .filter((c) => c.id !== clip.id)
      .sort((a, b) => a.startTime - b.startTime);

    let minStart = 0;
    let maxEnd = Infinity;

    for (const other of sorted) {
      const otherEnd = other.startTime + (other.trimEnd - other.trimStart);
      const currentClipEnd = clip.startTime + clipDuration;

      if (otherEnd <= clip.startTime) {
        minStart = Math.max(minStart, otherEnd);
      }

      if (other.startTime >= currentClipEnd) {
        maxEnd = Math.min(maxEnd, other.startTime);
        break;
      }
    }

    return { minStart, maxEnd };
  }, [otherClips, clip.id, clip.startTime, clipDuration]);

  const handleDrag = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      if (contentWidth === 0 || totalDuration === 0) return;

      const currentX = clipX.get();
      let newX = currentX + info.delta.x;

      const minX = timeToPixels(boundaries.minStart);
      const maxX = timeToPixels(boundaries.maxEnd - clipDuration);

      newX = Math.max(minX, Math.min(maxX, newX));

      clipX.set(newX);
    },
    [contentWidth, totalDuration, clipX, clipDuration, boundaries, timeToPixels]
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onDragStateChange?.(true);
  }, [onDragStateChange]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onDragStateChange?.(false);

    const newStartTime = pixelsToTime(clipX.get());

    onUpdate({
      startTime: Math.max(0, newStartTime),
    });
  }, [clipX, pixelsToTime, onUpdate, onDragStateChange]);

  const handleResizeStartDrag = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      if (contentWidth === 0 || totalDuration === 0) return;

      const currentX = clipX.get();
      const currentWidth = clipWidth.get();

      let newX = currentX + info.delta.x;
      let newWidth = currentWidth - info.delta.x;

      const minWidth = timeToPixels(MIN_CLIP_DURATION);

      if (newWidth < minWidth) {
        newWidth = minWidth;
        newX = currentX + currentWidth - minWidth;
      }

      const minX = timeToPixels(boundaries.minStart);

      if (newX < minX) {
        newWidth = newWidth - (minX - newX);
        newX = minX;
      }

      clipX.set(newX);
      clipWidth.set(newWidth);
    },
    [contentWidth, totalDuration, clipX, clipWidth, boundaries, timeToPixels]
  );

  const handleResizeEndDrag = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
      if (contentWidth === 0 || totalDuration === 0) return;

      const currentX = clipX.get();
      const currentWidth = clipWidth.get();

      let newWidth = currentWidth + info.delta.x;

      const minWidth = timeToPixels(MIN_CLIP_DURATION);
      newWidth = Math.max(minWidth, newWidth);

      if (Number.isFinite(boundaries.maxEnd)) {
        const maxWidthByBoundary = timeToPixels(boundaries.maxEnd) - currentX;
        newWidth = Math.min(newWidth, maxWidthByBoundary);
      }

      const maxAvailableDuration = clip.duration - clip.trimStart;
      const maxWidthBySource = timeToPixels(maxAvailableDuration);

      newWidth = Math.min(newWidth, maxWidthBySource);

      clipWidth.set(newWidth);
    },
    [
      contentWidth,
      totalDuration,
      clipWidth,
      clipX,
      boundaries,
      timeToPixels,
      clip.duration,
      clip.trimStart,
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

    const newStartTime = pixelsToTime(clipX.get());
    const newDuration = pixelsToTime(clipWidth.get());

    const trimDelta = newStartTime - clip.startTime;
    const newTrimStart = Math.max(0, clip.trimStart + trimDelta);
    const newTrimEnd = Math.min(clip.duration, newTrimStart + newDuration);

    onUpdate({
      startTime: Math.max(0, newStartTime),
      trimStart: newTrimStart,
      trimEnd: newTrimEnd,
    });
  }, [clipX, clipWidth, pixelsToTime, clip, onUpdate, onDragStateChange]);

  return (
    <motion.div
      ref={containerRef}
      className={`absolute top-0 bottom-0 rounded-md cursor-grab active:cursor-grabbing overflow-hidden group ${
        isSelected
          ? "ring-[1.5px] ring-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.3)] z-10"
          : ""
      } ${isInteracting ? "z-10" : "z-0"}`}
      style={{
        x: clipX,
        width: clipWidth,
        border: "1px solid rgba(52, 168, 83, 0.45)",
        background: "#102319",
      }}
      drag="x"
      dragConstraints={{ left: 0, right: contentWidth }}
      dragElastic={0}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 flex flex-col">
        <div className="relative h-[58%] overflow-hidden border-b border-emerald-400/10">
          {thumbnails.length > 0 ? (
            <div className="flex h-full w-full">
              {thumbnails.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="h-full min-w-[72px] flex-1 border-r border-black/30 bg-cover bg-center opacity-85"
                  style={{ backgroundImage: `url(${src})` }}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full w-full">
              {Array.from({
                length: Math.max(1, Math.ceil(zoomLevel * 3)),
              }).map((_, i) => (
                <div
                  key={i}
                  className="h-full flex-1 border-r border-[#34A853]/10 last:border-r-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(20,80,40,0.1) 50%, rgba(52,168,83,0.1) 100%)",
                    boxShadow: "inset 0px 1px 0px rgba(255,255,255,0.05)",
                  }}
                />
              ))}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/45" />
        </div>

        <div className="relative flex-1 overflow-hidden bg-black/20 px-1">
          {waveformPeaks.length > 0 ? (
            <div className="flex h-full w-full items-center gap-[1px]">
              {waveformPeaks.map((peak, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-full bg-emerald-300/70"
                  style={{
                    height: `${Math.max(8, peak * 100)}%`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full w-full items-center gap-[2px] opacity-40">
              {Array.from({ length: 64 }).map((_, index) => {
                const value = 18 + Math.abs(Math.sin(index * 0.55)) * 52;

                return (
                  <div
                    key={index}
                    className="flex-1 rounded-full bg-emerald-300/40"
                    style={{ height: `${value}%` }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <motion.div
        className="absolute top-0 bottom-0 left-0 border-r-2 border-[#4ade80] pointer-events-none z-[5]"
        style={{
          width: progressWidth,
          background:
            "linear-gradient(to bottom, rgba(52,168,83,0.55) 0%, rgba(34,139,34,0.65) 50%, rgba(20,80,40,0.75) 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span className="flex max-w-[85%] items-center gap-2 rounded-full border border-black/30 bg-black/45 px-2.5 py-1 text-emerald-200 text-[11px] font-medium shadow-lg backdrop-blur-sm">
          <Icon
            icon={
              isGeneratingMedia
                ? "solar:refresh-circle-bold"
                : "solar:videocamera-record-bold"
            }
            width="12"
            className={isGeneratingMedia ? "animate-spin opacity-80" : "opacity-80"}
          />

          <span className="truncate max-w-32">{clip.name}</span>

          <span className="text-emerald-200/70 font-mono text-[10px]">
            {formatDuration(clipDuration)}
          </span>
        </span>
      </div>

      {isHovered && (
        <div className="absolute right-2 top-1.5 z-20 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[10px] text-white/60 backdrop-blur-sm">
          {thumbnails.length > 0 ? "Thumbnails" : "Generando preview"}
        </div>
      )}

      <motion.div
        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 group/trim flex items-center justify-center"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDrag={handleResizeStartDrag}
        onDragStart={() => handleResizeStart("start")}
        onDragEnd={handleResizeEnd}
      >
        <div
          className={`w-1.5 h-8 rounded-full transition-all ${
            isResizing === "start"
              ? "bg-[#4ade80] scale-110"
              : "bg-[#34A853] group-hover/trim:bg-[#4ade80]"
          }`}
        />
      </motion.div>

      <motion.div
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 group/trim flex items-center justify-end"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDrag={handleResizeEndDrag}
        onDragStart={() => handleResizeStart("end")}
        onDragEnd={handleResizeEnd}
      >
        <div
          className={`w-1.5 h-8 rounded-full transition-all ${
            isResizing === "end"
              ? "bg-[#4ade80] scale-110"
              : "bg-[#34A853] group-hover/trim:bg-[#4ade80]"
          }`}
        />
      </motion.div>
    </motion.div>
  );
}
