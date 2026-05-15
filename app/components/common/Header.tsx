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
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
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
      return <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-200 shadow-[0_0_18px_rgba(254,202,202,0.75)]" aria-hidden="true" />;
    }

    return <Icon icon="material-symbols:cast-outline-rounded" className="h-4 w-4" aria-hidden="true" />;
  };

  return (
    <>
      <header
        className={cn(
          "fixed left-0 top-0 z-50 w-full transition-all duration-500",
          isScrolled ? "py-3" : "py-5"
        )}
      >
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div
            className={cn(
              "relative flex h-14 items-center justify-between overflow-hidden rounded-[1.35rem] border px-3 transition-all duration-500 sm:px-4",
              isScrolled
                ? "border-white/12 bg-[#07101d]/82 shadow-[0_18px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
                : "border-white/10 bg-white/[0.035] shadow-[0_10px_55px_rgba(0,0,0,0.2)] backdrop-blur-xl"
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(60,131,246,0.18),transparent_30%),radial-gradient(circle_at_88%_10%,rgba(125,240,248,0.10),transparent_24%)]" />

            <Link href="/" className="group relative z-10 flex items-center gap-2.5" aria-label="Studio - Ir al inicio">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3c83f6]/35 bg-[#3c83f6]/12 shadow-[0_0_34px_rgba(60,131,246,0.22)] transition group-hover:border-[#7df0f8]/45 group-hover:bg-[#3c83f6]/18">
                <Icon icon="solar:play-circle-bold" className="h-5 w-5 text-[#9bdcff]" aria-hidden="true" />
              </div>
              <div className="hidden flex-col leading-none sm:flex">
                <span className="text-sm font-black tracking-[-0.03em] text-white">Studio</span>
                <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-[#7df0f8]/50">Labs</span>
              </div>
            </Link>

            <nav className="relative z-10 hidden items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1 text-xs font-bold text-white/55 md:flex" aria-label="Main navigation">
              <Link href="/recordings" className="rounded-full px-3 py-1.5 transition hover:bg-white/10 hover:text-white">
                Mis grabaciones
              </Link>
              <a href="#features" className="rounded-full px-3 py-1.5 transition hover:bg-white/10 hover:text-white">
                Features
              </a>
              <a href="#preview" className="rounded-full px-3 py-1.5 transition hover:bg-white/10 hover:text-white">
                Preview
              </a>
            </nav>

            <div className="relative z-10 flex items-center gap-2">
              <Link
                href="/recordings"
                className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-bold text-white/75 transition hover:border-[#7df0f8]/30 hover:bg-[#3c83f6]/12 hover:text-[#bfeeff] lg:flex"
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
                  "hidden h-10 rounded-2xl border border-red-400/35 bg-gradient-to-b from-red-500 to-red-600 px-4 text-xs font-black text-white shadow-[0_18px_55px_rgba(239,68,68,0.36),inset_0_1px_0_rgba(255,255,255,0.24)] transition hover:scale-[1.025] hover:from-red-400 hover:to-red-600 hover:shadow-[0_22px_70px_rgba(239,68,68,0.46)] sm:flex",
                  isRecording && "border-red-300/45 bg-red-500/18 text-red-100 hover:bg-red-500/24"
                )}
              >
                {getButtonIcon()}
                <span>{isRecording ? tRecording("step4.visual.stop") : t("screen")}</span>
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
