"use client";

import { Icon } from "@iconify/react";
import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveUploadedVideo } from "@/lib/video-upload-cache";
import { saveUploadedImage } from "@/lib/image-upload-cache";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import GitHubBadge from "@/components/ui/GitHubStars";

interface HeroProps {
  onVideoUpload?: (file: File) => void;
  onPhotoUpload?: (file: File) => void;
}

export default function Hero({ onVideoUpload, onPhotoUpload }: HeroProps) {
  const t = useTranslations("hero");
  const router = useRouter();
  const locale = useLocale();

  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const handleVideoFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) return;

      setIsUploadingVideo(true);

      try {
        await saveUploadedVideo(file);

        if (onVideoUpload) {
          onVideoUpload(file);
        }

        router.push("/editor?mode=video");
      } catch (error) {
        console.error("Error uploading video:", error);
        setIsUploadingVideo(false);
      }
    },
    [onVideoUpload, router]
  );

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      handleVideoFile(file);
    }

    event.target.value = "";
  };

  const handleVideoDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingVideo(true);
  };

  const handleVideoDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingVideo(false);
  };

  const handleVideoDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingVideo(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleVideoFile(file);
    }
  };

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      setIsUploadingPhoto(true);

      try {
        await saveUploadedImage(file);

        if (onPhotoUpload) {
          onPhotoUpload(file);
        }

        router.push("/editor?mode=photo");
      } catch (error) {
        console.error("Error uploading photo:", error);
        setIsUploadingPhoto(false);
      }
    },
    [onPhotoUpload, router]
  );

  const handlePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      handlePhotoFile(file);
    }

    event.target.value = "";
  };

  const handlePhotoDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingPhoto(true);
  };

  const handlePhotoDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingPhoto(false);
  };

  const handlePhotoDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingPhoto(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handlePhotoFile(file);
    }
  };

  return (
    <>
      <h1 className="animate-reveal mb-6 text-5xl font-semibold leading-[1.1] tracking-tight text-white drop-shadow-[1.2px_1.2px_100.2px_rgba(183,203,248,1)] md:text-7xl">
        <div
          className={`absolute h-auto shadow-2xl transition-all ${
            locale === "es"
              ? "-top-16 left-14 -rotate-14 sm:-top-4 lg:top-0 xl:top-3"
              : "-top-16 left-16 -rotate-14 sm:-left-6 sm:top-0 xl:top-3"
          }`}
        >
          <GitHubBadge />
        </div>

        <img
          src="/svg/version.svg"
          alt=""
          aria-hidden="true"
          className={`absolute h-auto w-16 shadow-2xl transition-all sm:w-18 ${
            locale === "es"
              ? "-top-8 left-0 -rotate-10 sm:-top-4 sm:left-30 lg:top-0 xl:top-2"
              : "-top-8 -rotate-10 sm:left-10 sm:top-0 xl:top-2"
          }`}
        />

        {t.rich("title", {
          screen: (chunks) => (
            <span className="relative inline-flex items-center">
              <span className="sr-only">{chunks}</span>

              <img
                src="/svg/mockups.svg"
                alt=""
                aria-hidden="true"
                className="inline-block h-[1.6em] w-auto translate-y-[0.1em] align-middle sm:translate-y-[0.3em]"
              />

              <img
                src="/svg/cursor-animate.svg"
                className="absolute -right-28 -top-18 h-[4em] w-auto sm:-right-30 sm:-top-25"
                alt=""
                aria-hidden="true"
              />
            </span>
          ),
        })}

        <br />

        <span className="bg-linear-to-r from-neutral-200 via-neutral-400 to-[#009CF2] bg-clip-text text-transparent">
          {t("titleHighlight")}
        </span>
      </h1>

      <p className="animate-reveal mx-auto mb-10 max-w-2xl text-lg font-light leading-relaxed text-neutral-400 [animation-delay:150ms] md:text-xl">
        {t("description")}
      </p>

      <div className="animate-reveal mb-5 flex flex-col items-center justify-center gap-3 [animation-delay:300ms] sm:flex-row">
        <div className="flex w-full flex-col items-center gap-2 sm:w-72">
          <div
            onDragOver={handleVideoDragOver}
            onDragLeave={handleVideoDragLeave}
            onDrop={handleVideoDrop}
            onClick={() => !isUploadingVideo && videoInputRef.current?.click()}
            className={`squircle-element relative flex h-13 w-full cursor-pointer items-center justify-center border-2 border-dashed px-5 text-sm font-medium transition-all duration-200 ${
              isDraggingVideo
                ? "scale-[1.02] border-blue-400/70 bg-blue-500/10 text-blue-300"
                : isUploadingVideo
                  ? "cursor-not-allowed border-white/20 bg-white/5 text-white/40"
                  : "border-white/20 bg-white/5 text-white/90 hover:border-white/40 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            <div className="pointer-events-none flex w-full items-center justify-center gap-3">
              {isUploadingVideo ? (
                <>
                  <Icon
                    icon="svg-spinners:ring-resize"
                    width="18"
                    className="shrink-0 text-blue-400"
                    aria-hidden="true"
                  />
                  <span>{t("uploadButtonUploading")}</span>
                </>
              ) : isDraggingVideo ? (
                <>
                  <Icon
                    icon="ph:arrow-fat-down-bold"
                    width="18"
                    className="shrink-0 text-blue-400"
                    aria-hidden="true"
                  />
                  <span>{t("uploadButtonDragging")}</span>
                </>
              ) : (
                <>
                  <Icon
                    icon="mage:video-upload"
                    width="22"
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  <span>{t("uploadButton")}</span>
                  <span className="text-xs text-white/40">MP4, WebM, MOV</span>
                </>
              )}
            </div>

            {isDraggingVideo && (
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-blue-500/5 blur-sm" />
            )}
          </div>

          <Link
            href="/editor?mode=video"
            className="text-sm text-white/60 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white/80"
          >
            {t("goToVideoEditor")}
          </Link>

          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
            className="hidden"
            onChange={handleVideoFileChange}
            aria-label={t("uploadButton")}
          />
        </div>

        <div className="flex w-full flex-col items-center gap-2 sm:w-72">
          <div
            onDragOver={handlePhotoDragOver}
            onDragLeave={handlePhotoDragLeave}
            onDrop={handlePhotoDrop}
            onClick={() => !isUploadingPhoto && photoInputRef.current?.click()}
            className={`squircle-element relative flex h-13 w-full cursor-pointer items-center justify-center border-2 border-dashed px-5 text-sm font-medium transition-all duration-200 ${
              isDraggingPhoto
                ? "scale-[1.02] border-red-400/70 bg-red-500/10 text-red-300"
                : isUploadingPhoto
                  ? "cursor-not-allowed border-white/20 bg-white/5 text-white/40"
                  : "border-white/20 bg-white/5 text-white/90 hover:border-white/40 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            <div className="pointer-events-none flex w-full items-center justify-center gap-3">
              {isUploadingPhoto ? (
                <>
                  <Icon
                    icon="svg-spinners:ring-resize"
                    width="18"
                    className="shrink-0 text-red-400"
                    aria-hidden="true"
                  />
                  <span>{t("uploadPhotoUploading")}</span>
                </>
              ) : isDraggingPhoto ? (
                <>
                  <Icon
                    icon="ph:arrow-fat-down-bold"
                    width="18"
                    className="shrink-0 text-red-400"
                    aria-hidden="true"
                  />
                  <span>{t("uploadPhotoDragging")}</span>
                </>
              ) : (
                <>
                  <Icon
                    icon="solar:gallery-wide-linear"
                    width="20"
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  <span>{t("uploadPhotoButton")}</span>
                  <span className="text-xs text-white/40">JPG, PNG, WEBP</span>
                </>
              )}
            </div>

            {isDraggingPhoto && (
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-red-500/5 blur-sm" />
            )}
          </div>

          <Link
            href="/editor?mode=photo"
            className="text-sm text-white/60 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white/80"
          >
            {t("goToPhotoEditor")}
          </Link>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handlePhotoFileChange}
            aria-label={t("uploadPhotoButton")}
          />
        </div>
      </div>

      <div className="animate-reveal flex flex-col items-center justify-center gap-3 [animation-delay:450ms] sm:flex-row">
        <Link
          href="/recordings"
          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.08)] transition hover:border-cyan-300/50 hover:bg-cyan-400/15 hover:text-white"
        >
          <Icon
            icon="material-symbols:video-library-outline-rounded"
            className="h-5 w-5"
            aria-hidden="true"
          />
          Mis grabaciones
        </Link>

        <Link
          href="/editor?mode=video"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
        >
          <Icon
            icon="solar:clapperboard-edit-linear"
            className="h-5 w-5"
            aria-hidden="true"
          />
          Abrir editor
        </Link>
      </div>
    </>
  );
}