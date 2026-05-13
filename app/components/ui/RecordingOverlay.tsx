"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

interface RecordingOverlayProps {
    isRecording: boolean;
    isPaused?: boolean;
    recordingTime: number;
    onStop: () => void;
}

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function RecordingOverlay({
    isRecording,
    isPaused = false,
    recordingTime,
    onStop,
}: RecordingOverlayProps) {
    const [pipSupported, setPipSupported] = useState(false);
    const [pipActive, setPipActive] = useState(false);

    const pipWindowRef = useRef<Window | null>(null);
    const timerRef = useRef<HTMLElement | null>(null);

    const formattedTime = useMemo(() => {
        return formatTime(recordingTime);
    }, [recordingTime]);

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
            setPipActive(false);
        }
    }, [isRecording]);

    const openFloatingTimer = async () => {
        try {
            // @ts-ignore
            if (!window.documentPictureInPicture) return;

            // @ts-ignore
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

            timerRef.current =
                pipWindow.document.getElementById("pip-timer");

            const stopBtn =
                pipWindow.document.getElementById("stop-btn");

            stopBtn?.addEventListener("click", () => {
                onStop();
                pipWindow.close();
            });

            pipWindow.addEventListener("pagehide", () => {
                setPipActive(false);
                pipWindowRef.current = null;
            });
        } catch (err) {
            console.error("PiP error:", err);
        }
    };

    if (!isRecording) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999]"
            >
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="w-3 h-3 rounded-full bg-red-500" />

                            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
                        </div>

                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold">
                                {isPaused ? "Paused" : "Recording"}
                            </span>

                            <span className="text-white font-bold text-lg tabular-nums">
                                {formattedTime}
                            </span>
                        </div>
                    </div>

                    <div className="w-px h-8 bg-white/10" />

                    {pipSupported && (
                        <button
                            onClick={openFloatingTimer}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                                pipActive
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/20"
                                    : "bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"
                            }`}
                        >
                            <Icon
                                icon="solar:sidebar-minimalistic-bold"
                                width="16"
                            />

                            Timer flotante
                        </button>
                    )}

                    <button
                        onClick={onStop}
                        className="flex items-center gap-2 rounded-xl bg-red-500 hover:bg-red-400 transition-colors px-4 py-2 text-white font-semibold shadow-[0_8px_24px_rgba(239,68,68,0.35)]"
                    >
                        <Icon icon="solar:stop-bold" width="16" />

                        Detener
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
