"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link } from "@/navigation";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { useRecording } from "@/hooks/RecordingContext";
import RecordingSetupDialog from "../ui/RecordingSetupDialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function Header() {
  const t = useTranslations("header");
  const tRecording = useTranslations("recording.steps");

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const {
    startCountdown,
    stopRecording,
    isRecording,
    isCountdown,
    isProcessing,
  } = useRecording();

  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [showMobileAlert, setShowMobileAlert] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleHeaderAction = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const isMobile =
      typeof window !== "undefined" &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
        window.innerWidth < 768);

    if (isMobile) {
      setShowMobileAlert(true);
      setTimeout(() => setShowMobileAlert(false), 5000);
    } else {
      setSetupDialogOpen(true);
    }
  };

  const getButtonContent = () => {
    if (isCountdown || isProcessing) {
      return (
        <Icon
          icon="eos-icons:loading"
          className="h-4 w-4 animate-spin"
          aria-hidden="true"
        />
      );
    }

    if (isRecording) {
      return (
        <div
          className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"
          aria-hidden="true"
        />
      );
    }

    return (
      <Icon
        icon="material-symbols:cast-outline-rounded"
        className="h-4 w-4"
        aria-hidden="true"
      />
    );
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-300",
          isScrolled
            ? "border-b border-white/10 bg-[#050505]/80 py-0 backdrop-blur-xl"
            : "border-transparent bg-transparent py-2"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-2"
            aria-label="Studio - Ir al inicio"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
                <Icon
                  icon="material-symbols:play-circle-rounded"
                  className="h-5 w-5 text-cyan-300"
                  aria-hidden="true"
                />
              </div>

              <span className="hidden text-lg font-bold tracking-tight text-white sm:inline-flex">
                Studio
              </span>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-8 text-md font-medium text-neutral-400 md:flex"
            aria-label="Main navigation"
          >
            <Link href="/recordings" className="transition-colors hover:text-white">
              Mis grabaciones
            </Link>

            <a href="#docs" className="transition-colors hover:text-white">
              Documentación
            </a>
          </nav>

          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/recordings"
              className="hidden items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold tracking-tight text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100 lg:flex"
            >
              <Icon
                icon="material-symbols:video-library-outline-rounded"
                className="h-4 w-4"
                aria-hidden="true"
              />
              Mis grabaciones
            </Link>

            <Button
              variant="outline"
              onClick={handleHeaderAction}
              disabled={isCountdown || isProcessing}
              aria-label={isRecording ? tRecording("step4.visual.stop") : t("screen")}
              aria-pressed={isRecording}
              className={cn(
                "hidden transition-all sm:flex",
                isRecording && "border-red-500/50 text-red-400 hover:bg-red-500/5"
              )}
            >
              {getButtonContent()}

              <span className="text-xs font-bold tracking-tight">
                {isRecording ? tRecording("step4.visual.stop") : t("screen")}
              </span>

              {!isRecording && (
                <kbd
                  className="ml-1 hidden items-center rounded border border-white/20 bg-black/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/80 lg:flex"
                  aria-label="Alt + S"
                >
                  Alt + S
                </kbd>
              )}
            </Button>

            <div className="flex items-center gap-2">
              {!isMounted ? (
                <div className="h-9 w-25 animate-pulse rounded-md border border-white/5 bg-white/10" />
              ) : (
                <LanguageSwitcher />
              )}

              <div className="block">
                {!isMounted ? (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className="h-8 w-8 animate-pulse rounded-full border border-white/5 bg-white/10" />
                    <div className="h-4 w-24 animate-pulse rounded-md bg-white/10" />
                  </div>
                ) : (
                  <UserMenu />
                )}
              </div>

              {!isMounted ? (
                <div className="h-9 w-9 animate-pulse rounded-md border border-white/5 bg-white/10" />
              ) : (
                <MobileMenu />
              )}
            </div>
          </div>
        </div>

        {showMobileAlert && (
          <div className="absolute top-20 left-1/2 w-full max-w-xs -translate-x-1/2 px-4">
            <Alert
              variant="warning"
              className="border-yellow-500/50 bg-[#0A0A0A]"
              role="alert"
            >
              <Icon
                icon="solar:laptop-minimalistic-broken"
                className="text-xl"
                aria-hidden="true"
              />
              <AlertTitle>{tRecording("step1.permissionRequired")}</AlertTitle>
              <AlertDescription>{tRecording("step1.mobileAlert")}</AlertDescription>
            </Alert>
          </div>
        )}
      </header>

      <RecordingSetupDialog
        open={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        onStart={(config) => startCountdown(config)}
      />
    </>
  );
}