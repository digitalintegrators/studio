"use client";

import { useState, useCallback, useRef } from "react";
import type { ImageExportFormat } from "@/types/image-project.types";
import type { VideoCanvasHandle } from "@/types/editor.types";

export interface ImageExportProgress {
    status: "idle" | "preparing" | "rendering" | "complete" | "error";
    progress: number;
    message: string;
}

interface UseImageExportOptions {
    canvasRef: React.RefObject<VideoCanvasHandle | null>;
}

export function useImageExport({ canvasRef }: UseImageExportOptions) {
    const [exportProgress, setExportProgress] = useState<ImageExportProgress>({
        status: "idle",
        progress: 0,
        message: "",
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    const resetProgress = useCallback(() => {
        setExportProgress({
            status: "idle",
            progress: 0,
            message: "",
        });
    }, []);

    const exportImage = useCallback(async (
        format: ImageExportFormat,
        quality: number,
        scale: number = 1
    ): Promise<void> => {
        const canvas = canvasRef.current?.getExportCanvas?.();
        if (!canvas) {
            setExportProgress({
                status: "error",
                progress: 0,
                message: "Canvas not available",
            });
            return;
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            setExportProgress({
                status: "preparing",
                progress: 10,
                message: "Preparing export...",
            });

            if (canvasRef.current?.drawFrame) {
                await canvasRef.current.drawFrame();
            }

            if (signal.aborted) {
                resetProgress();
                return;
            }

            setExportProgress({
                status: "rendering",
                progress: 30,
                message: "Rendering image...",
            });

            let exportCanvas = canvas;
            
            if (scale !== 1) {
                exportCanvas = document.createElement("canvas");
                exportCanvas.width = canvas.width * scale;
                exportCanvas.height = canvas.height * scale;
                
                const ctx = exportCanvas.getContext("2d", { 
                    alpha: format === "png",
                    willReadFrequently: false,
                });
                
                if (!ctx) {
                    throw new Error("Failed to create export canvas context");
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);
            }

            if (signal.aborted) {
                resetProgress();
                return;
            }

            setExportProgress({
                status: "rendering",
                progress: 60,
                message: "Encoding image...",
            });

            const mimeType = format === "png"
                ? "image/png"
                : format === "jpeg"
                    ? "image/jpeg"
                    : format === "avif"
                        ? "image/avif"
                        : "image/webp";

            if (format === "avif") {
                const avifSupported = await new Promise<boolean>(resolve => {
                    const testCanvas = document.createElement("canvas");
                    testCanvas.width = testCanvas.height = 1;
                    testCanvas.toBlob(
                        b => resolve(b !== null && b.type === "image/avif"),
                        "image/avif"
                    );
                });
                if (!avifSupported) {
                    throw new Error("AVIF encoding is not supported in this browser. Please use WebP or PNG instead.");
                }
            }

            const blob = await new Promise<Blob>((resolve, reject) => {
                exportCanvas.toBlob(
                    (b) => {
                        if (b) {
                            resolve(b);
                        } else {
                            reject(new Error(`Failed to encode as ${format.toUpperCase()}. Try a different format.`));
                        }
                    },
                    mimeType,
                    format === "png" ? undefined : quality
                );
            });

            if (signal.aborted) {
                resetProgress();
                return;
            }

            setExportProgress({
                status: "rendering",
                progress: 90,
                message: "Downloading...",
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            const scaleLabel = scale > 1 ? `@${scale}x` : "";
            const qualityLabel = format !== "png" ? `-q${Math.round(quality * 100)}` : "";
            const filename = `openvid-export-${timestamp}${scaleLabel}${qualityLabel}.${format}`;

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            const sizeDisplay = blob.size > 1024 * 1024
                ? `${(blob.size / 1024 / 1024).toFixed(2)} MB`
                : `${Math.round(blob.size / 1024)} KB`;

            setExportProgress({
                status: "complete",
                progress: 100,
                message: `Export complete! ${sizeDisplay}`,
            });

            setTimeout(() => {
                resetProgress();
            }, 2000);

        } catch (error) {
            if (signal.aborted) {
                resetProgress();
                return;
            }

            console.error("Image export error:", error);
            setExportProgress({
                status: "error",
                progress: 0,
                message: error instanceof Error ? error.message : "Export failed",
            });
        } finally {
            abortControllerRef.current = null;
        }
    }, [canvasRef, resetProgress]);

    const cancelExport = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        resetProgress();
    }, [resetProgress]);

    const copyToClipboard = useCallback(async (): Promise<boolean> => {
        const canvas = canvasRef.current?.getExportCanvas?.();
        if (!canvas) return false;

        try {
            if (canvasRef.current?.drawFrame) {
                await canvasRef.current.drawFrame();
            }

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (b) => {
                        if (b) resolve(b);
                        else reject(new Error("Failed to create blob"));
                    },
                    "image/png"
                );
            });

            await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob })
            ]);

            return true;
        } catch (error) {
            console.error("Failed to copy to clipboard:", error);
            return false;
        }
    }, [canvasRef]);

    return {
        exportImage,
        cancelExport,
        copyToClipboard,
        exportProgress,
        resetProgress,
    };
}
