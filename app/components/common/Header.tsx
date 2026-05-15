"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRecording } from "@/hooks/RecordingContext";
import RecordingSetupDialog from "../ui/RecordingSetupDialog";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { UserMenu } from "./UserMenu";

export default function Header() {
  const t = useTranslations("header");
  const tRecording = useTranslations("recording.steps");

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [showMobileAlert, setShowMobileAlert] = useState(false);

  const { startCountdown, stopRecording, isRecording, isCountdown, isProcessing } = useRecording();

  useEffect(() => {
    const timer = window.setTimeout(() => setIsMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 18);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleHeaderAction = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const isMobile =
      typeof window !== "undefined" &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);

    if (isMobile) {
      setShowMobileAlert(true);
      window.setTimeout(() => setShowMobileAlert(false), 5000);
      return;
    }

    setSetupDialogOpen(true);
  };

  const getButtonIcon = () => {
    if (isCountdown || isProcessing) {
      return <Icon icon="eos-icons:loading" className="h-4 w-4 animate-spin" aria-hidden="true" />;
    }

    if (isRecording) {
      return <span className="h-2.5 w-2.5 animate-pulse rounded-sm bg-red-400" aria-hidden="true" />;
    }

    return <Icon icon="material-symbols:cast-outline-rounded" className="h-4 w-4" aria-hidden="true" />;
  };

  return (
    <>
      <header
        className={cn(
          "fixed left-0 top-0 z-50 w-full transition-all duration-300",
          isScrolled ? "py-3" : "py-5"
        )}
      >
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div
            className={cn(
              "flex h-14 items-center justify-between rounded-2xl border px-3 transition-all duration-300 sm:px-4",
              isScrolled
                ? "border-white/10 bg-[#070a12]/78 shadow-[0_18px_80px_rgba(0,0,0,0.38)] backdrop-blur-2xl"
                : "border-white/8 bg-white/[0.025] backdrop-blur-md"
            )}
          >
            <Link href="/" className="group flex items-center gap-2" aria-label="Studio - Ir al inicio">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.14)] transition group-hover:border-cyan-300/45 group-hover:bg-cyan-300/15">
                <Icon icon="solar:play-circle-bold" className="h-5 w-5 text-cyan-200" aria-hidden="true" />
              </div>
              <div className="hidden flex-col leading-none sm:flex">
                <span className="text-sm font-black tracking-tight text-white">Studio</span>
                <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-200/45">Labs</span>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full border border-white/8 bg-black/15 p-1 text-xs font-bold text-white/55 md:flex" aria-label="Main navigation">
              <Link href="/recordings" className="rounded-full px-3 py-1.5 transition hover:bg-white/8 hover:text-white">
                Mis grabaciones
              </Link>
              <a href="#features" className="rounded-full px-3 py-1.5 transition hover:bg-white/8 hover:text-white">
                Features
              </a>
              <a href="#docs" className="rounded-full px-3 py-1.5 transition hover:bg-white/8 hover:text-white">
                Docs
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/recordings"
                className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/75 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100 lg:flex"
              >
                <Icon icon="material-symbols:video-library-outline-rounded" className="h-4 w-4" aria-hidden="true" />
                Mis grabaciones
              </Link>

              <Button
                variant="outline"
                onClick={handleHeaderAction}
                disabled={isCountdown || isProcessing}
                aria-label={isRecording ? tRecording("step4.visual.stop") : t("screen")}
                aria-pressed={isRecording}
                className={cn(
                  "hidden h-10 rounded-xl border-white/10 bg-white text-xs font-black text-[#07111f] shadow-[0_12px_45px_rgba(255,255,255,0.13)] transition hover:scale-[1.02] hover:bg-cyan-50 sm:flex",
                  isRecording && "border-red-400/40 bg-red-500/12 text-red-200 hover:bg-red-500/15"
                )}
              >
                {getButtonIcon()}
                <span>{isRecording ? tRecording("step4.visual.stop") : t("screen")}</span>
                {!isRecording && (
                  <kbd className="ml-1 hidden rounded border border-black/10 bg-black/5 px-1.5 py-0.5 text-[9px] font-black uppercase text-black/55 lg:inline-flex">
                    Alt S
                  </kbd>
                )}
              </Button>

              {!isMounted ? <div className="h-9 w-20 animate-pulse rounded-xl bg-white/8" /> : <LanguageSwitcher />}
              {!isMounted ? <div className="h-9 w-9 animate-pulse rounded-full bg-white/8" /> : <UserMenu />}
              {!isMounted ? <div className="h-9 w-9 animate-pulse rounded-xl bg-white/8" /> : <MobileMenu />}
            </div>
          </div>
        </div>

        {showMobileAlert && (
          <div className="absolute left-1/2 top-20 w-full max-w-xs -translate-x-1/2 px-4">
            <Alert variant="warning" className="border-yellow-500/40 bg-[#0A0A0A]/95 backdrop-blur-xl" role="alert">
              <Icon icon="solar:laptop-minimalistic-broken" className="text-xl" aria-hidden="true" />
              <AlertTitle>{tRecording("step1.permissionRequired")}</AlertTitle>
              <AlertDescription>{tRecording("step1.mobileAlert")}</AlertDescription>
            </Alert>
          </div>
        )}
      </header>

      <RecordingSetupDialog open={setupDialogOpen} onClose={() => setSetupDialogOpen(false)} onStart={(config) => startCountdown(config)} />
    </>
  );
}
