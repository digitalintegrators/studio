"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useRecording } from "@/hooks/RecordingContext";

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function RecordingOverlay() {
  const {
    isRecording,
    recordingTime,
    stopRecording,
    state,
    countdown,
  } = useRecording();

  const [pipSupported, setPipSupported] = useState(false);
  const [pipActive, setPipActive] = useState(false);

  const pipWindowRef = useRef<Window | null>(null);
  const timerRef = useRef<HTMLElement | null>(null);

  const formattedTime = useMemo(() => {
    return formatTime(recordingTime);
  }, [recordingTime]);

  const isCountdown = state === "countdown";

  useEffect(() => {
    setPipSupported(
      typeof window !== "undefined" &&
        "documentPictureInPicture" in window
    );
  }, []);

  useEffect(() => {
    if (!pipActive || !timerRef.current) return;

    timerRef.current.innerText = formattedTime;
  }, [formattedTime, pipActive]);

  useEffect(() => {
    if (!isRecording && pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      timerRef.current = null;
      setPipActive(false);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
        timerRef.current = null;
      }
    };
  }, []);

  const openFloatingTimer = async () => {
    try {
      // @ts-ignore - Document Picture-in-Picture is still experimental in TS DOM libs.
      if (!window.documentPictureInPicture) return;

      // @ts-ignore - Document Picture-in-Picture is still experimental in TS DOM libs.
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 120,
      });

      pipWindowRef.current = pipWindow;
      setPipActive(true);

      pipWindow.document.body.style.margin = "0";
      pipWindow.document.body.style.background = "#09090B";
      pipWindow.document.body.style.overflow = "hidden";
      pipWindow.document.body.style.fontFamily =
        "Inter, system-ui, sans-serif";

      pipWindow.document.body.innerHTML = `
        <div id="recorder-root" style="
          width:100%;
          height:100%;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:16px;
          box-sizing:border-box;
          background:
            radial-gradient(circle at top left, rgba(239,68,68,0.18), transparent 40%),
            linear-gradient(135deg,#111827,#09090B);
        ">
          <div style="
            width:100%;
            height:100%;
            border-radius:20px;
            border:1px solid rgba(255,255,255,0.08);
            background:rgba(17,24,39,0.85);
            backdrop-filter:blur(16px);
            display:flex;
            align-items:center;
            justify-content:space-between;
            padding:18px;
            box-sizing:border-box;
            color:white;
            box-shadow:
              0 10px 40px rgba(0,0,0,0.45),
              inset 0 1px 0 rgba(255,255,255,0.05);
          ">
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="
                width:14px;
                height:14px;
                border-radius:999px;
                background:#ef4444;
                box-shadow:0 0 20px rgba(239,68,68,0.7);
                animation:pulse 1.2s infinite;
              "></div>

              <div style="display:flex;flex-direction:column;">
                <span style="
                  font-size:12px;
                  color:rgba(255,255,255,0.6);
                  font-weight:600;
                ">
                  Recording
                </span>

                <span id="pip-timer" style="
                  font-size:28px;
                  font-weight:700;
                  letter-spacing:-0.03em;
                ">
                  ${formattedTime}
                </span>
              </div>
            </div>

            <button id="stop-btn" style="
              border:none;
              outline:none;
              cursor:pointer;
              background:#ef4444;
              color:white;
              border-radius:14px;
              padding:12px 18px;
              font-weight:700;
              font-size:13px;
              transition:all .2s ease;
              box-shadow:0 6px 20px rgba(239,68,68,0.35);
            ">
              Stop
            </button>
          </div>
        </div>

        <style>
          @keyframes pulse {
            0% { transform:scale(1); opacity:1; }
            50% { transform:scale(1.12); opacity:.7; }
            100% { transform:scale(1); opacity:1; }
          }
        </style>
      `;

      timerRef.current = pipWindow.document.getElementById("pip-timer");

      const stopBtn = pipWindow.document.getElementById("stop-btn");

      stopBtn?.addEventListener("click", () => {
        stopRecording();
        pipWindow.close();
      });

      pipWindow.addEventListener("pagehide", () => {
        setPipActive(false);
        pipWindowRef.current = null;
        timerRef.current = null;
      });
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  if (!isRecording && !isCountdown) return null;

  return (
    <AnimatePresence>
      {isCountdown && (
        <motion.div
          key="recording-countdown-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/65 backdrop-blur-md"
        >
          <motion.div
            key={countdown}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-[140px] font-black tracking-[-0.08em] text-white drop-shadow-[0_20px_80px_rgba(56,189,248,0.35)]"
          >
            {countdown}
          </motion.div>
        </motion.div>
      )}

      {isRecording && (
        <motion.div
          key="recording-floating-overlay"
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          className="fixed top-5 left-1/2 z-[9999]"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="absolute inset-0 rounded-full bg-red-500 opacity-60 animate-ping" />
              </div>

              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Recording
                </span>

                <span className="text-lg font-bold tabular-nums text-white">
                  {formattedTime}
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-white/10" />

            {pipSupported && (
              <button
                type="button"
                onClick={openFloatingTimer}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  pipActive
                    ? "border border-cyan-400/20 bg-cyan-500/20 text-cyan-300"
                    : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                <Icon icon="solar:sidebar-minimalistic-bold" width="16" />
                Timer flotante
              </button>
            )}

            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 font-semibold text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] transition-colors hover:bg-red-400"
            >
              <Icon icon="solar:stop-bold" width="16" />
              Detener
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
