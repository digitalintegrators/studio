"use client";

import { Icon } from "@iconify/react";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { saveUploadedVideo } from "@/lib/video-upload-cache";
import { saveUploadedImage } from "@/lib/image-upload-cache";
import { useRecording } from "@/hooks/RecordingContext";
import RecordingSetupDialog from "@/app/components/ui/RecordingSetupDialog";
import EditorPreview from "@/app/components/ui/EditorPreview";

interface HeroProps {
  onVideoUpload?: (file: File) => void;
  onPhotoUpload?: (file: File) => void;
}

const copy = {
  es: {
    eyebrow: "Studio para demos, cursos y PoCs técnicas",
    title: "Diseñado para que el editor se vea tan bien como el resultado.",
    description:
      "Graba pantalla, cámara, micrófono y audio del sistema. Después enfoca, resalta y edita con una experiencia visual pensada para explicar mejor.",
    record: "Grabar pantalla",
    uploadVideo: "Subir video",
    uploadPhoto: "Editar imagen",
    library: "Mis grabaciones",
    dragVideo: "Arrastra un video o haz click",
    dragPhoto: "Arrastra una imagen o haz click",
    uploading: "Preparando archivo...",
  },
  en: {
    eyebrow: "Studio for demos, courses and technical PoCs",
    title: "Designed so the editor looks as polished as the final result.",
    description:
      "Record screen, camera, microphone and system audio. Then focus, highlight and edit with a visual experience built to explain better.",
    record: "Record screen",
    uploadVideo: "Upload video",
    uploadPhoto: "Edit image",
    library: "My recordings",
    dragVideo: "Drop a video or click",
    dragPhoto: "Drop an image or click",
    uploading: "Preparing file...",
  },
};

export default function Hero({ onVideoUpload, onPhotoUpload }: HeroProps) {
  const locale = useLocale();
  const router = useRouter();
  const text = copy[locale as "es" | "en"] ?? copy.es;

  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const { startCountdown, isCountdown, isProcessing } = useRecording();

  const handleVideoFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) return;
      setIsUploadingVideo(true);

      try {
        await saveUploadedVideo(file);
        onVideoUpload?.(file);
        router.push("/editor?mode=video");
      } catch (error) {
        console.error("Error uploading video:", error);
        setIsUploadingVideo(false);
      }
    },
    [onVideoUpload, router]
  );

  const handlePhotoFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setIsUploadingPhoto(true);

      try {
        await saveUploadedImage(file);
        onPhotoUpload?.(file);
        router.push("/editor?mode=photo");
      } catch (error) {
        console.error("Error uploading photo:", error);
        setIsUploadingPhoto(false);
      }
    },
    [onPhotoUpload, router]
  );

  return (
    <>
      <div className="relative mx-auto max-w-6xl text-center">
        <div className="animate-reveal mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#7df0f8]/20 bg-[#3c83f6]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bfeeff] shadow-[0_0_34px_rgba(60,131,246,0.16)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7df0f8] shadow-[0_0_16px_rgba(125,240,248,0.85)]" />
          {text.eyebrow}
        </div>

        <h1 className="animate-reveal mx-auto max-w-5xl text-balance text-5xl font-semibold leading-[0.92] tracking-[-0.075em] text-white [animation-delay:80ms] sm:text-6xl lg:text-8xl">
          {text.title}
        </h1>

        <p className="animate-reveal mx-auto mt-7 max-w-2xl text-balance text-base leading-7 text-slate-300/82 [animation-delay:160ms] sm:text-xl sm:leading-8">
          {text.description}
        </p>

        <div className="animate-reveal mt-9 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
          <button
            type="button"
            onClick={() => setSetupDialogOpen(true)}
            disabled={isCountdown || isProcessing}
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-[1.35rem] border border-red-300/35 bg-gradient-to-b from-red-500 to-red-600 px-7 text-sm font-black tracking-tight text-white shadow-[0_24px_80px_rgba(239,68,68,0.38),inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:scale-[1.025] hover:from-red-400 hover:to-red-600 hover:shadow-[0_30px_96px_rgba(239,68,68,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-white/30 blur-md" />
              <Icon icon="material-symbols:cast-outline-rounded" className="relative h-5 w-5" />
            </span>
            {text.record}
            <span className="ml-1 hidden rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-black text-white/75 sm:inline-flex">Alt + D</span>
          </button>

          <Link
            href="/recordings"
            className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-6 text-sm font-bold text-white/85 backdrop-blur-xl transition hover:border-[#7df0f8]/25 hover:bg-[#3c83f6]/12 hover:text-[#bfeeff]"
          >
            <Icon icon="material-symbols:video-library-outline-rounded" className="h-5 w-5" />
            {text.library}
          </Link>
        </div>

        <div className="animate-reveal mx-auto mt-5 grid max-w-2xl gap-3 [animation-delay:320ms] sm:grid-cols-2">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingVideo(true);
            }}
            onDragLeave={() => setIsDraggingVideo(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingVideo(false);
              const file = event.dataTransfer.files?.[0];
              if (file) handleVideoFile(file);
            }}
            onClick={() => !isUploadingVideo && videoInputRef.current?.click()}
            className={`group flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left backdrop-blur-xl transition ${
              isDraggingVideo
                ? "border-[#7df0f8]/50 bg-[#3c83f6]/14"
                : "border-white/10 bg-white/[0.035] hover:border-[#7df0f8]/25 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#7df0f8]/20 bg-[#3c83f6]/10 text-[#bfeeff]">
              <Icon icon="solar:upload-square-bold" className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{text.uploadVideo}</div>
              <div className="text-xs text-white/45">{isUploadingVideo ? text.uploading : text.dragVideo}</div>
            </div>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingPhoto(true);
            }}
            onDragLeave={() => setIsDraggingPhoto(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingPhoto(false);
              const file = event.dataTransfer.files?.[0];
              if (file) handlePhotoFile(file);
            }}
            onClick={() => !isUploadingPhoto && photoInputRef.current?.click()}
            className={`group flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left backdrop-blur-xl transition ${
              isDraggingPhoto
                ? "border-violet-300/50 bg-violet-300/12"
                : "border-white/10 bg-white/[0.035] hover:border-violet-300/25 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/10 text-violet-200">
              <Icon icon="solar:gallery-add-bold" className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{text.uploadPhoto}</div>
              <div className="text-xs text-white/45">{isUploadingPhoto ? text.uploading : text.dragPhoto}</div>
            </div>
          </div>
        </div>

        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleVideoFile(file);
            event.target.value = "";
          }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handlePhotoFile(file);
            event.target.value = "";
          }}
        />
      </div>

      <div className="relative mt-12 sm:mt-16">
        <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[640px] w-[82%] -translate-x-1/2 rounded-full bg-[#3c83f6]/18 blur-[170px]" />
        <div className="pointer-events-none absolute bottom-0 left-[18%] -z-10 h-[420px] w-[420px] rounded-full bg-violet-500/14 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-10 right-[16%] -z-10 h-[360px] w-[360px] rounded-full bg-[#7df0f8]/10 blur-[120px]" />
        <EditorPreview compact />
      </div>

      <RecordingSetupDialog
        open={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        onStart={(config) => startCountdown(config)}
      />
    </>
  );
}
