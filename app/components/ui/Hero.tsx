"use client";

import { Icon } from "@iconify/react";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import GitHubBadge from "@/components/ui/GitHubStars";
import { saveUploadedVideo } from "@/lib/video-upload-cache";
import { saveUploadedImage } from "@/lib/image-upload-cache";
import { useRecording } from "@/hooks/RecordingContext";
import RecordingSetupDialog from "@/app/components/ui/RecordingSetupDialog";

interface HeroProps {
  onVideoUpload?: (file: File) => void;
  onPhotoUpload?: (file: File) => void;
}

const copy = {
  es: {
    eyebrow: "Studio para demos, cursos y PoCs técnicas",
    titleA: "Crea demos",
    titleB: "cinemáticas",
    titleC: "sin salir del navegador",
    description:
      "Graba pantalla, cámara, micrófono y audio del sistema. Después edita con timeline, spotlight, máscaras, zooms y exportación profesional.",
    record: "Grabar pantalla",
    uploadVideo: "Subir video",
    uploadPhoto: "Editar imagen",
    library: "Mis grabaciones",
    dragVideo: "Arrastra un video o haz click",
    dragPhoto: "Arrastra una imagen o haz click",
    uploading: "Preparando archivo...",
    badges: ["Audio sistema + micrófono", "Spotlight & máscaras", "Timeline premium"],
    stats: [
      { label: "Browser-first", value: "100%" },
      { label: "Editor visual", value: "4K" },
      { label: "Sin instalar", value: "0 apps" },
    ],
  },
  en: {
    eyebrow: "Studio for demos, courses and technical PoCs",
    titleA: "Create",
    titleB: "cinematic demos",
    titleC: "directly in your browser",
    description:
      "Record screen, camera, microphone and system audio. Then edit with timeline, spotlight, masks, zooms and professional export.",
    record: "Record screen",
    uploadVideo: "Upload video",
    uploadPhoto: "Edit image",
    library: "My recordings",
    dragVideo: "Drop a video or click",
    dragPhoto: "Drop an image or click",
    uploading: "Preparing file...",
    badges: ["System audio + mic", "Spotlight & masks", "Premium timeline"],
    stats: [
      { label: "Browser-first", value: "100%" },
      { label: "Visual editor", value: "4K" },
      { label: "No install", value: "0 apps" },
    ],
  },
};

function ProductMockup() {
  return (
    <div className="relative mx-auto mt-14 w-full max-w-6xl animate-reveal [animation-delay:420ms]">
      <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.35),transparent_45%),radial-gradient(circle_at_20%_60%,rgba(168,85,247,0.2),transparent_35%)] blur-2xl" />

      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#070b14]/80 p-2 shadow-[0_24px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div className="rounded-[1.5rem] border border-white/10 bg-[#090d16]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-300/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/55 sm:flex">
              <Icon icon="solar:videocamera-record-bold" className="h-3.5 w-3.5 text-cyan-300" />
              studio.laboratorios.digital/editor
            </div>

            <div className="h-7 w-20 rounded-full border border-white/10 bg-white/[0.04]" />
          </div>

          <div className="grid gap-0 lg:grid-cols-[76px_minmax(0,1fr)_280px]">
            <aside className="hidden border-r border-white/10 bg-white/[0.02] p-3 lg:block">
              {[
                "solar:scissors-bold",
                "solar:magic-stick-3-bold",
                "solar:mask-happly-bold",
                "solar:cursor-bold",
                "solar:palette-bold",
              ].map((icon, index) => (
                <div
                  key={icon}
                  className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border ${
                    index === 1
                      ? "border-cyan-400/35 bg-cyan-400/15 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.16)]"
                      : "border-white/10 bg-white/[0.04] text-white/45"
                  }`}
                >
                  <Icon icon={icon} className="h-5 w-5" />
                </div>
              ))}
            </aside>

            <main className="relative min-h-[320px] overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(14,165,233,0.16),transparent_35%),#05070d] p-4 sm:min-h-[460px] sm:p-8">
              <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:24px_24px]" />

              <div className="relative mx-auto flex aspect-video max-w-3xl items-center justify-center rounded-[1.7rem] border border-white/10 bg-[#101828] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                <div className="absolute inset-5 rounded-[1.25rem] bg-[linear-gradient(135deg,#111827,#020617)]" />
                <div className="absolute left-[18%] top-[20%] h-[20%] w-[42%] rounded-2xl bg-white/8" />
                <div className="absolute left-[18%] top-[48%] h-[8%] w-[64%] rounded-full bg-white/7" />
                <div className="absolute left-[18%] top-[62%] h-[8%] w-[48%] rounded-full bg-white/6" />

                <div className="absolute left-[14%] top-[15%] h-[34%] w-[56%] rounded-[1.25rem] border border-amber-300/80 bg-transparent shadow-[0_0_0_999px_rgba(0,0,0,0.48),0_0_70px_rgba(251,191,36,0.2)]" />

                <div className="absolute bottom-5 right-5 h-20 w-20 overflow-hidden rounded-full border border-white/20 bg-[#111827] shadow-2xl">
                  <div className="h-full w-full bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.22),transparent_25%),linear-gradient(135deg,#334155,#020617)]" />
                </div>
              </div>
            </main>

            <aside className="hidden border-l border-white/10 bg-white/[0.025] p-4 lg:block">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/70">Inspector</span>
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-200">Spotlight</span>
              </div>

              <div className="space-y-3">
                {[
                  ["X", "28%"],
                  ["Y", "19%"],
                  ["Width", "56%"],
                  ["Blur", "18px"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-[11px] text-white/45">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div className="border-t border-white/10 bg-[#070a12] p-3">
            <div className="mb-3 flex items-center justify-center gap-3">
              <div className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04]" />
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.22)]">
                <Icon icon="solar:play-bold" className="h-5 w-5" />
              </div>
              <div className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04]" />
            </div>

            <div className="space-y-2">
              <div className="flex h-10 overflow-hidden rounded-xl border border-emerald-400/25 bg-emerald-400/10">
                {Array.from({ length: 14 }).map((_, index) => (
                  <div key={index} className="flex-1 border-r border-black/20 bg-gradient-to-b from-white/10 to-transparent" />
                ))}
              </div>

              <div className="relative h-7 rounded-xl border border-amber-300/20 bg-white/[0.03]">
                <div className="absolute left-[20%] top-1 h-5 w-[18%] rounded-lg border border-amber-300/50 bg-amber-300/20 text-center text-[10px] font-bold leading-5 text-amber-100">Spot</div>
                <div className="absolute left-[48%] top-1 h-5 w-[20%] rounded-lg border border-violet-300/50 bg-violet-300/20 text-center text-[10px] font-bold leading-5 text-violet-100">Mask</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <div className="relative mx-auto max-w-5xl text-center">
        <div className="absolute -top-16 left-4 hidden rotate-[-10deg] sm:block">
          <GitHubBadge />
        </div>

        <div className="animate-reveal mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)]" />
          {text.eyebrow}
        </div>

        <h1 className="animate-reveal mx-auto max-w-5xl text-balance text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-white [animation-delay:80ms] sm:text-6xl lg:text-8xl">
          {text.titleA} <span className="bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent">{text.titleB}</span>
          <br />
          <span className="text-white/70">{text.titleC}</span>
        </h1>

        <p className="animate-reveal mx-auto mt-7 max-w-2xl text-balance text-base leading-7 text-slate-300/85 [animation-delay:160ms] sm:text-xl sm:leading-8">
          {text.description}
        </p>

        <div className="animate-reveal mt-9 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
          <button
            type="button"
            onClick={() => setSetupDialogOpen(true)}
            disabled={isCountdown || isProcessing}
            className="group inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black tracking-tight text-[#07111f] shadow-[0_18px_60px_rgba(255,255,255,0.18)] transition hover:scale-[1.02] hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon icon="material-symbols:cast-outline-rounded" className="h-5 w-5" />
            {text.record}
          </button>

          <Link
            href="/recordings"
            className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 text-sm font-bold text-white/85 backdrop-blur-xl transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100"
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
            className={`group flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
              isDraggingVideo
                ? "border-cyan-300/50 bg-cyan-300/12"
                : "border-white/10 bg-white/[0.035] hover:border-cyan-300/25 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
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
            className={`group flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
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

        <div className="animate-reveal mt-6 flex flex-wrap items-center justify-center gap-2 [animation-delay:400ms]">
          {text.badges.map((badge) => (
            <span key={badge} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-white/55">
              {badge}
            </span>
          ))}
        </div>

        <div className="animate-reveal mx-auto mt-8 grid max-w-xl grid-cols-3 gap-2 [animation-delay:480ms]">
          {text.stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 backdrop-blur-xl">
              <div className="text-lg font-black text-white sm:text-2xl">{stat.value}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{stat.label}</div>
            </div>
          ))}
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

      <ProductMockup />

      <RecordingSetupDialog
        open={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        onStart={(config) => startCountdown(config)}
      />
    </>
  );
}
