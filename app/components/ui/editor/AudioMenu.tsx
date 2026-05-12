"use client";

import { Icon } from "@iconify/react";
import { useCallback, useRef, useState } from "react";
import type { AudioMenuProps, AudioTrack } from "@/types/audio.types";
import {
  MAX_AUDIO_FILE_SIZE,
  MAX_AUDIO_FILE_SIZE_MB,
  SUPPORTED_AUDIO_EXTENSIONS,
  SUPPORTED_AUDIO_FORMATS,
} from "@/types/audio.types";
import { AudioTrimModal } from "./AudioTrimModal";
import { Button } from "@/components/ui/button";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { TrackVolumeSlider } from "@/components/ui/TrackVolumeSlider";
import { useTranslations } from "next-intl";

export function AudioMenu({
  audioTracks,
  uploadedAudios,
  videoDuration,
  onAudioUpload,
  onUpdateAudioTrack,
  onDeleteAudioTrack,
  onExtendProjectToAudioDuration,
}: AudioMenuProps) {
  const t = useTranslations("audioMenu");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [trimModalOpen, setTrimModalOpen] = useState(false);
  const [trimModalTrack, setTrimModalTrack] = useState<AudioTrack | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateAudioFile = useCallback((file: File): boolean => {
    const fileName = file.name.toLowerCase();

    const hasSupportedMimeType = SUPPORTED_AUDIO_FORMATS.some(
      (mimeType) => mimeType === file.type
    );

    const hasSupportedExtension = SUPPORTED_AUDIO_EXTENSIONS.some((extension) =>
      fileName.endsWith(extension)
    );

    if (!hasSupportedMimeType && !hasSupportedExtension) {
      alert("Formato de audio no soportado. Usa MP3, WAV, OGG, AAC, M4A o MP4.");
      return false;
    }

    if (file.size > MAX_AUDIO_FILE_SIZE) {
      alert(
        `El archivo es demasiado grande. El tamaño máximo permitido es ${MAX_AUDIO_FILE_SIZE_MB}MB.`
      );
      return false;
    }

    return true;
  }, []);

  const processAudioFile = useCallback(
    (file: File) => {
      if (!validateAudioFile(file)) return;
      onAudioUpload(file);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onAudioUpload, validateAudioFile]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      processAudioFile(file);
    },
    [processAudioFile]
  );

  const formatDuration = (seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const mins = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      processAudioFile(file);
    },
    [processAudioFile]
  );

  const handleToggleLoop = useCallback(
    (track: AudioTrack) => {
      onUpdateAudioTrack(track.id, {
        loop: !track.loop,
      });
    },
    [onUpdateAudioTrack]
  );

  const handleFitToVideo = useCallback(
    (track: AudioTrack) => {
      const availableDuration = Math.max(videoDuration - track.startTime, 0.1);

      onUpdateAudioTrack(track.id, {
        duration: Math.min(track.duration, availableDuration),
      });
    },
    [onUpdateAudioTrack, videoDuration]
  );

  const handleFadeChange = useCallback(
    (track: AudioTrack, key: "fadeIn" | "fadeOut", value: number) => {
      onUpdateAudioTrack(track.id, {
        [key]: Math.max(0, Math.min(value, track.duration / 2)),
      });
    },
    [onUpdateAudioTrack]
  );

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center gap-2 font-medium text-white">
        <Icon icon="mdi:volume-high" width="20" aria-hidden="true" />
        <span>{t("title")}</span>
      </div>

      <div
        className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed p-3 transition-colors ${
          isDragOver
            ? "border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-500/40"
            : "border-white/10 bg-white/[0.02]"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.ogg,.aac,.m4a,.mp4,audio/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label={t("uploadButton")}
        />

        <Button
          variant="outline"
          className="w-full text-xs"
          onClick={() => fileInputRef.current?.click()}
          aria-label={t("uploadButton")}
        >
          <Icon icon="mdi:upload" width="14" />
          <span>{t("uploadButton")}</span>
        </Button>

        <p className="mt-2 text-center text-xs text-white/40">
          MP3, WAV, OGG, AAC, M4A, MP4 · hasta {MAX_AUDIO_FILE_SIZE_MB}MB
        </p>
      </div>

      {audioTracks.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-white/60">
            <Icon icon="mdi:timeline-clock" width="14" />
            <span>{t("timelineTracks", { count: audioTracks.length })}</span>
          </div>

          <div className="flex flex-col gap-2">
            {audioTracks.map((track) => {
              const isSelected = selectedTrackId === track.id;
              const exceedsVideoDuration =
                track.startTime + track.duration > videoDuration;
              const fadeIn = track.fadeIn ?? 0;
              const fadeOut = track.fadeOut ?? 0;

              return (
                <div
                  key={track.id}
                  className={`squircle-element border bg-[#09090B] p-3 transition-all ${
                    isSelected
                      ? "border-cyan-500/50 bg-cyan-500/5"
                      : "border-white/5 hover:border-white/10"
                  }`}
                  onClick={() => setSelectedTrackId(isSelected ? null : track.id)}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">
                        {track.name}
                      </div>

                      <div className="mt-0.5 text-xs text-white/40">
                        Inicio: {formatDuration(track.startTime)} • Duración:{" "}
                        {formatDuration(track.duration)}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {track.loop ? (
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                            Loop
                          </span>
                        ) : null}

                        {track.volume !== 1 ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/50">
                            Vol {Math.round(track.volume * 100)}%
                          </span>
                        ) : null}

                        {fadeIn > 0 ? (
                          <span className="rounded-full border border-purple-400/20 bg-purple-400/10 px-2 py-0.5 text-[10px] font-semibold text-purple-200">
                            Fade in {fadeIn}s
                          </span>
                        ) : null}

                        {fadeOut > 0 ? (
                          <span className="rounded-full border border-purple-400/20 bg-purple-400/10 px-2 py-0.5 text-[10px] font-semibold text-purple-200">
                            Fade out {fadeOut}s
                          </span>
                        ) : null}
                      </div>

                      {exceedsVideoDuration && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-400">
                          <Icon icon="mdi:alert" width="12" />
                          El audio supera la duración del video
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <TooltipAction label={track.loop ? "Desactivar loop" : "Activar loop"}>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleLoop(track);
                          }}
                          className={`rounded p-1.5 transition-all ${
                            track.loop
                              ? "bg-cyan-500/10 text-cyan-300"
                              : "text-white/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                          }`}
                        >
                          <Icon icon="solar:repeat-bold" width="16" />
                        </button>
                      </TooltipAction>

                      {exceedsVideoDuration && onExtendProjectToAudioDuration ? (
                        <TooltipAction label="Extender proyecto">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onExtendProjectToAudioDuration(track.id);
                            }}
                            className="rounded p-1.5 text-white/40 transition-all hover:bg-emerald-500/10 hover:text-emerald-300"
                          >
                            <Icon icon="solar:maximize-square-3-bold" width="16" />
                          </button>
                        </TooltipAction>
                      ) : null}

                      {exceedsVideoDuration ? (
                        <TooltipAction label="Ajustar al video">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleFitToVideo(track);
                            }}
                            className="rounded p-1.5 text-white/40 transition-all hover:bg-orange-500/10 hover:text-orange-300"
                          >
                            <Icon icon="solar:minimize-square-3-bold" width="16" />
                          </button>
                        </TooltipAction>
                      ) : null}

                      <TooltipAction label={t("trimAction")}>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setTrimModalTrack(track);
                            setTrimModalOpen(true);
                          }}
                          className="rounded p-1.5 text-white/40 transition-all hover:bg-blue-500/10 hover:text-blue-400"
                        >
                          <Icon icon="mdi:content-cut" width="16" />
                        </button>
                      </TooltipAction>

                      <TooltipAction label={t("deleteAction")}>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteAudioTrack(track.id);

                            if (selectedTrackId === track.id) {
                              setSelectedTrackId(null);
                            }
                          }}
                          className="rounded p-1.5 text-white/40 transition-all hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Icon icon="material-symbols:delete-outline-rounded" width="16" />
                        </button>
                      </TooltipAction>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex flex-col gap-3 border-t border-white/5 pt-3 duration-150 animate-in fade-in">
                      <TrackVolumeSlider
                        track={track}
                        onUpdateAudioTrack={onUpdateAudioTrack}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleLoop(track);
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            track.loop
                              ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                              : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                          }`}
                        >
                          {track.loop ? "Loop activo" : "Activar loop"}
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleFitToVideo(track);
                          }}
                          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/50 transition hover:text-white"
                        >
                          Ajustar al video
                        </button>

                        {onExtendProjectToAudioDuration ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onExtendProjectToAudioDuration(track.id);
                            }}
                            className="col-span-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/15"
                          >
                            Extender proyecto a duración del audio
                          </button>
                        ) : null}
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-white/70">
                          <Icon icon="solar:soundwave-bold" width="14" />
                          Fade in / Fade out
                        </div>

                        <div className="grid gap-3">
                          <label className="flex flex-col gap-2 text-xs text-white/50">
                            Fade in: {fadeIn.toFixed(1)}s
                            <input
                              type="range"
                              min={0}
                              max={Math.min(10, track.duration / 2)}
                              step={0.1}
                              value={fadeIn}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                handleFadeChange(
                                  track,
                                  "fadeIn",
                                  Number(event.target.value)
                                )
                              }
                              className="w-full accent-cyan-400"
                            />
                          </label>

                          <label className="flex flex-col gap-2 text-xs text-white/50">
                            Fade out: {fadeOut.toFixed(1)}s
                            <input
                              type="range"
                              min={0}
                              max={Math.min(10, track.duration / 2)}
                              step={0.1}
                              value={fadeOut}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                handleFadeChange(
                                  track,
                                  "fadeOut",
                                  Number(event.target.value)
                                )
                              }
                              className="w-full accent-cyan-400"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {audioTracks.length === 0 && (
        <div className="px-4 py-8 text-center text-white/40" role="status">
          <Icon icon="mdi:music-note-off" width="48" className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("noTracks")}</p>
          <p className="mt-1 text-xs">Sube una pista de audio para música, voz o efectos.</p>
        </div>
      )}

      {trimModalOpen &&
        trimModalTrack &&
        (() => {
          const originalAudio = uploadedAudios.find(
            (audio) => audio.id === trimModalTrack.audioId
          );

          if (!originalAudio) return null;

          return (
            <AudioTrimModal
              key={trimModalTrack.id}
              isOpen={trimModalOpen}
              audioName={trimModalTrack.name}
              audioUrl={originalAudio.url}
              audioDuration={originalAudio.duration}
              initialTrimStart={trimModalTrack.trimStart ?? 0}
              initialTrimEnd={
                (trimModalTrack.trimStart ?? 0) + trimModalTrack.duration
              }
              onConfirm={(trimStart, trimEnd) => {
                onUpdateAudioTrack(trimModalTrack.id, {
                  duration: trimEnd - trimStart,
                  trimStart,
                });

                setTrimModalOpen(false);
                setTrimModalTrack(null);
              }}
              onCancel={() => {
                setTrimModalOpen(false);
                setTrimModalTrack(null);
              }}
            />
          );
        })()}
    </div>
  );
}