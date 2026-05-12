"use client";

import { useState, useEffect } from "react";
import { Link } from "@/navigation";
import { Icon } from "@iconify/react";
import { useAuth } from "@/hooks/useAuth";
import { hasAnyVideo } from "@/lib/video-cache-utils";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function MobileMenu() {
  const t = useTranslations("header");
  const [isOpen, setIsOpen] = useState(false);
  const [hasCachedVideo, setHasCachedVideo] = useState(false);
  const { user, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsMounted(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const checkVideo = () => {
      hasAnyVideo()
        .then(setHasCachedVideo)
        .catch(() => {});
    };

    checkVideo();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkVideo();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleSignOut = async () => {
    setIsLoggingOut(true);

    try {
      await signOut();
      setIsOpen(false);
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoggingOut(false);
    }
  };

  const closeMenu = () => setIsOpen(false);

  if (!isMounted) {
    return (
      <button
        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
        aria-label={t("menu")}
      >
        <Icon icon="solar:hamburger-menu-linear" className="h-6 w-6" />
      </button>
    );
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
          aria-label={t("menu")}
          aria-expanded={isOpen}
        >
          <Icon
            icon="solar:hamburger-menu-linear"
            className="h-6 w-6"
            aria-hidden="true"
          />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-in bg-black/80 backdrop-blur-sm duration-200 fade-in" />

        <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-70 animate-in flex-col border-l border-white/10 bg-[#0a0a0a] duration-300 slide-in-from-right">
          <div className="flex items-center justify-between border-b border-white/5 p-4">
            <div className="flex flex-col">
              <Dialog.Title className="sr-only">{t("menu")}</Dialog.Title>
              <Dialog.Description className="sr-only">
                {t("menu")}
              </Dialog.Description>

              <Link
                href="/"
                onClick={closeMenu}
                className="flex items-center gap-2"
              >
                <Image
                  src="/svg/logo-openvid.svg"
                  alt="Logo"
                  width={32}
                  height={32}
                />
                <Image
                  src="/svg/openvid.svg"
                  alt="OpenVid"
                  width={80}
                  height={20}
                />
              </Link>
            </div>

            <Dialog.Close asChild>
              <button
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
                aria-label={t("close")}
              >
                <Icon
                  icon="solar:close-square-linear"
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </button>
            </Dialog.Close>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              <Link
                href="/recordings"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-cyan-100 transition-colors hover:bg-cyan-400/15 hover:text-white"
              >
                <Icon
                  icon="material-symbols:video-library-outline-rounded"
                  className="h-5 w-5"
                  aria-hidden="true"
                />
                <span>Mis grabaciones</span>

                {hasCachedVideo ? (
                  <span className="ml-auto h-2 w-2 rounded-full bg-cyan-300" />
                ) : null}
              </Link>

              {hasCachedVideo ? (
                <Link
                  href="/editor"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Icon
                    icon="solar:clapperboard-edit-linear"
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                  <span>Continuar edición</span>
                </Link>
              ) : null}

              <Link
                href="/#docs"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Icon
                  icon="solar:document-text-linear"
                  className="h-5 w-5"
                  aria-hidden="true"
                />
                <span>{t("docs")}</span>
              </Link>

              <a
                href="https://github.com/CristianOlivera1/openvid"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Icon icon="mdi:github" className="h-5 w-5" aria-hidden="true" />
                <span>{t("github")}</span>
                <Icon
                  icon="solar:external-link-linear"
                  className="ml-auto h-4 w-4 opacity-50"
                  aria-hidden="true"
                />
              </a>

              <a
                href="/donate"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Icon icon="mdi:donate" className="h-5 w-5" aria-hidden="true" />
                <span>{t("donate")}</span>
                <Icon
                  icon="solar:external-link-linear"
                  className="ml-auto h-4 w-4 opacity-50"
                  aria-hidden="true"
                />
              </a>
            </div>
          </nav>

          <div className="border-t border-white/5 p-4">
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-500 transition-all duration-200 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <>
                    <Icon
                      icon="svg-spinners:ring-resize"
                      className="h-5 w-5 animate-spin"
                      aria-hidden="true"
                    />
                    <span className="font-medium">{t("loggingOut")}</span>
                  </>
                ) : (
                  <>
                    <Icon
                      icon="solar:logout-2-linear"
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                    <span className="font-medium">{t("logout")}</span>
                  </>
                )}
              </button>
            ) : (
              <Button variant="primary" asChild className="w-full">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <Icon
                    icon="solar:login-2-linear"
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                  <span>{t("login")}</span>
                </Link>
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}