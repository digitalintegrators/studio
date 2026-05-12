"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, usePathname } from "@/navigation";
import type { RecordingState } from "@/types";
import type {
  CameraConfig,
  RecordingSetupConfig,
} from "@/types/camera.types";
import type {
  CursorRecordingData,
  CursorKeyframe,
} from "@/types/cursor.types";

import {
  DEFAULT_RECORDING_SETUP,
  requestCameraStream,
  requestMicrophoneStream,
} from "@/types/camera.types";

import { clearAllThumbnailCache } from "@/lib/thumbnail-cache";

export type { RecordingState };

function generateVideoId(): string {
  return `vid_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;
}

function getPermissionErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "No se pudo iniciar la captura. Revisa los permisos del navegador.";
  }

  if (error.name === "NotAllowedError") {
    return "Permiso denegado. Debes permitir compartir pantalla, micrófono o cámara para iniciar la grabación.";
  }

  if (error.name === "NotFoundError") {
    return "No se encontró un dispositivo disponible. Revisa que tu micrófono o cámara estén conectados.";
  }

  if (error.name === "NotReadableError") {
    return "El dispositivo está siendo usado por otra aplicación. Cierra otras apps y vuelve a intentarlo.";
  }

  if (error.name === "AbortError") {
    return "La captura fue cancelada antes de iniciar.";
  }

  return error.message || "No se pudo iniciar la grabación.";
}

async function cleanupOldRecordings(db: IDBDatabase): Promise<void> {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - SEVEN_DAYS_MS;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction("videos", "readwrite");
      const store = transaction.objectStore("videos");

      const getAllKeysRequest = store.getAllKeys();

      getAllKeysRequest.onsuccess = () => {
        const keys = getAllKeysRequest.result;

        keys.forEach((key) => {
          if (key === "currentVideo") return;

          const getRequest = store.get(key);

          getRequest.onsuccess = () => {
            const record = getRequest.result as
              | { timestamp?: number }
              | undefined;

            if (record?.timestamp && record.timestamp < cutoff) {
              store.delete(key);
            }
          };
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const dbName = "openvidDB";
    const storeName = "videos";
    const version = 3;

    const request = indexedDB.open(dbName, version);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      cleanupOldRecordings(db).catch(() => {});
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

async function saveVideoToIndexedDB(
  blob: Blob,
  duration: number,
  extras: {
    cameraBlob?: Blob | null;
    cameraConfig?: CameraConfig | null;
    cursorData?: CursorRecordingData | null;
  } = {}
): Promise<string> {
  try {
    await clearAllThumbnailCache();
  } catch (error) {
    console.warn("Failed to clear thumbnail cache:", error);
  }

  const videoId = generateVideoId();
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");

    const videoData = {
      blob,
      duration,
      videoId,
      timestamp: Date.now(),
      isRecordedVideo: true,
      cameraBlob: extras.cameraBlob ?? null,
      cameraConfig: extras.cameraConfig ?? null,
      cursorData: extras.cursorData ?? null,
    };

    const putRequest = store.put(videoData, videoId);

    putRequest.onsuccess = () => {
      store.put(
        {
          videoId,
          timestamp: videoData.timestamp,
        },
        "currentVideo"
      );
    };

    transaction.oncomplete = () => {
      db.close();
      resolve(videoId);
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? putRequest.error);
    };
  });
}

export async function loadVideoFromIndexedDB(): Promise<{
  blob: Blob;
  duration: number;
  url: string;
  videoId: string;
  timestamp: number;
  isRecordedVideo?: boolean;
  cameraBlob?: Blob | null;
  cameraUrl?: string | null;
  cameraConfig?: CameraConfig | null;
  cursorData?: CursorRecordingData | null;
} | null> {
  try {
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["videos"], "readonly");
      const store = transaction.objectStore("videos");

      const currentRequest = store.get("currentVideo");

      currentRequest.onsuccess = () => {
        const currentData = currentRequest.result;

        if (!currentData) {
          db.close();
          resolve(null);
          return;
        }

        const currentVideoId =
          typeof currentData === "string"
            ? currentData
            : currentData.videoId;

        const videoRequest = store.get(currentVideoId);

        videoRequest.onsuccess = () => {
          db.close();

          const data = videoRequest.result;

          if (!data?.blob) {
            resolve(null);
            return;
          }

          const url = URL.createObjectURL(data.blob);

          const cameraBlob: Blob | null = data.cameraBlob ?? null;

          resolve({
            blob: data.blob,
            duration: data.duration,
            url,
            videoId: data.videoId,
            timestamp: data.timestamp,
            isRecordedVideo: data.isRecordedVideo || false,
            cameraBlob,
            cameraUrl: cameraBlob
              ? URL.createObjectURL(cameraBlob)
              : null,
            cameraConfig: data.cameraConfig ?? null,
            cursorData: data.cursorData ?? null,
          });
        };

        videoRequest.onerror = () => {
          db.close();
          reject(videoRequest.error);
        };
      };

      currentRequest.onerror = () => {
        db.close();
        reject(currentRequest.error);
      };
    });
  } catch (error) {
    console.error("Error al cargar video desde la base de datos:", error);
    return null;
  }
}

export async function deleteRecordedVideo(): Promise<void> {
  try {
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["videos"], "readwrite");
      const store = transaction.objectStore("videos");

      const currentRequest = store.get("currentVideo");

      currentRequest.onsuccess = () => {
        const currentData = currentRequest.result;

        const currentVideoId =
          typeof currentData === "string"
            ? currentData
            : currentData?.videoId;

        if (currentVideoId) {
          store.delete(currentVideoId);
        }

        store.delete("currentVideo");
      };

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    throw error;
  }
}

const titles = {
  idle: "openvid - Crea tomas cinemáticas",
  countdown: (count: number) => `Grabando en ${count}...`,
  recording: "Grabando...",
  processing: "⏳ Procesando video...",
};

function pickSupportedMimeType(preferred: string[]): string | undefined {
  for (const mimeType of preferred) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    } catch {}
  }

  return undefined;
}

export function useScreenRecording() {
  const [state, setState] = useState<RecordingState>("idle");
  const [countdown, setCountdown] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);

  const [cameraStream, setCameraStream] =
    useState<MediaStream | null>(null);

  const [cameraConfig, setCameraConfig] =
    useState<CameraConfig | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraRecorderRef = useRef<MediaRecorder | null>(null);

  const screenChunksRef = useRef<Blob[]>([]);
  const cameraChunksRef = useRef<Blob[]>([]);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const startTimeRef = useRef<number>(0);

  const originalTitleRef = useRef<string>("");

  const stateRef = useRef<RecordingState>("idle");

  const cameraConfigRef = useRef<CameraConfig | null>(null);

  const cursorFramesRef = useRef<CursorKeyframe[]>([]);
  const cursorTrackingCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    cameraConfigRef.current = cameraConfig;
  }, [cameraConfig]);

  const startCursorTracking = useCallback(() => {
    cursorFramesRef.current = [];

    const start = performance.now();

    const handleMove = (e: MouseEvent) => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      cursorFramesRef.current.push({
        time: (performance.now() - start) / 1000,
        x: (e.clientX / width) * 100,
        y: (e.clientY / height) * 100,
        state: "default",
        clicking: false,
      });
    };

    const handleDown = (e: MouseEvent) => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      cursorFramesRef.current.push({
        time: (performance.now() - start) / 1000,
        x: (e.clientX / width) * 100,
        y: (e.clientY / height) * 100,
        state: "pointer",
        clicking: true,
      });
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mousedown", handleDown);

    cursorTrackingCleanupRef.current = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mousedown", handleDown);
    };
  }, []);

  const stopCursorTracking = useCallback(() => {
    cursorTrackingCleanupRef.current?.();
    cursorTrackingCleanupRef.current = null;
  }, []);

  const cleanupStreams = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());

    if (
      audioCtxRef.current &&
      audioCtxRef.current.state !== "closed"
    ) {
      audioCtxRef.current.close().catch(() => undefined);
    }

    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    micStreamRef.current = null;
    audioCtxRef.current = null;

    setCameraStream(null);

    stopCursorTracking();
  }, [stopCursorTracking]);

  const stopRecording = useCallback(() => {
    if (
      screenRecorderRef.current &&
      screenRecorderRef.current.state !== "inactive"
    ) {
      screenRecorderRef.current.stop();
    }

    if (
      cameraRecorderRef.current &&
      cameraRecorderRef.current.state !== "inactive"
    ) {
      cameraRecorderRef.current.stop();
    }
  }, []);

  const updateCameraConfig = useCallback(
    (partial: Partial<CameraConfig>) => {
      setCameraConfig((prev) =>
        prev ? { ...prev, ...partial } : prev
      );
    },
    []
  );

  const startRecording = useCallback(
    (screenStream: MediaStream, camStream: MediaStream | null) => {
      try {
        cursorFramesRef.current = [];
        startCursorTracking();

        screenChunksRef.current = [];
        cameraChunksRef.current = [];

        startTimeRef.current = Date.now();

        const screenMime =
          pickSupportedMimeType([
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
          ]) || undefined;

        const screenRecorder = new MediaRecorder(
          screenStream,
          screenMime ? { mimeType: screenMime } : undefined
        );

        screenRecorderRef.current = screenRecorder;

        screenRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            screenChunksRef.current.push(event.data);
          }
        };

        let cameraRecorder: MediaRecorder | null = null;

        if (camStream) {
          cameraRecorder = new MediaRecorder(camStream);

          cameraRecorderRef.current = cameraRecorder;

          cameraRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              cameraChunksRef.current.push(event.data);
            }
          };
        }

        let pendingCount = cameraRecorder ? 2 : 1;

        let screenBlob: Blob | null = null;
        let cameraBlob: Blob | null = null;

        const finalize = async () => {
          setState("processing");

          const duration =
            (Date.now() - startTimeRef.current) / 1000;

          stopCursorTracking();

          const cursorData: CursorRecordingData = {
            hasCursorData: cursorFramesRef.current.length > 0,
            keyframes: cursorFramesRef.current,
            videoDimensions: {
              width: screenStream.getVideoTracks()[0]?.getSettings().width ?? 1920,
              height: screenStream.getVideoTracks()[0]?.getSettings().height ?? 1080,
            },
              frameRate: screenStream.getVideoTracks()[0]?.getSettings().frameRate ?? 30,
          };

          cleanupStreams();

          try {
            await saveVideoToIndexedDB(
              screenBlob || new Blob([], { type: "video/webm" }),
              duration,
              {
                cameraBlob,
                cameraConfig: cameraConfigRef.current,
                cursorData,
              }
            );

            setRecordingTime(0);

            if (pathname === "/editor") {
              window.location.reload();
            } else {
              router.push("/editor");
            }
          } catch (err) {
            console.error(err);

            setError("Error al guardar el video.");
            setState("idle");
          }
        };

        screenRecorder.onstop = () => {
          screenBlob = new Blob(screenChunksRef.current, {
            type: "video/webm",
          });

          pendingCount--;

          if (pendingCount <= 0) {
            finalize();
          }
        };

        if (cameraRecorder) {
          cameraRecorder.onstop = () => {
            cameraBlob = new Blob(cameraChunksRef.current, {
              type: "video/webm",
            });

            pendingCount--;

            if (pendingCount <= 0) {
              finalize();
            }
          };
        }

        setState("recording");

        setTimeout(() => {
          startTimeRef.current = Date.now();

          screenRecorder.start(1000);
          cameraRecorder?.start(1000);
        }, 300);
      } catch (err) {
        console.error(err);

        setError(getPermissionErrorMessage(err));

        cleanupStreams();

        setState("idle");
      }
    },
    [
      router,
      pathname,
      cleanupStreams,
      startCursorTracking,
      stopCursorTracking,
    ]
  );

  const startCountdown = useCallback(
    async (setupArg?: RecordingSetupConfig) => {
      const setup = setupArg ?? DEFAULT_RECORDING_SETUP;

      try {
        setError(null);

        const screenStream =
          await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: setup.systemAudio,
          });

        screenStreamRef.current = screenStream;

        let camStream: MediaStream | null = null;

        if (setup.camera.enabled) {
          try {
            camStream = await requestCameraStream(
              setup.camera.deviceId
            );

            cameraStreamRef.current = camStream;

            setCameraStream(camStream);
            setCameraConfig(setup.camera);
          } catch (err) {
            console.warn(err);
          }
        }

        setState("countdown");
        setCountdown(3);

        let count = 3;

        const interval = setInterval(() => {
          count--;

          setCountdown(count);

          if (count <= 0) {
            clearInterval(interval);

            startRecording(screenStream, camStream);
          }
        }, 1000);
      } catch (err) {
        console.error(err);

        setError(getPermissionErrorMessage(err));

        cleanupStreams();

        setState("idle");
      }
    },
    [cleanupStreams, startRecording]
  );

  const cancelRecording = useCallback(() => {
    stopRecording();

    cleanupStreams();

    setRecordingTime(0);

    setState("idle");

    setCameraConfig(null);
  }, [cleanupStreams, stopRecording]);

  return {
    state,
    countdown,
    recordingTime,
    error,
    startCountdown,
    stopRecording,
    cancelRecording,
    isIdle: state === "idle",
    isCountdown: state === "countdown",
    isRecording: state === "recording",
    isProcessing: state === "processing",
    cameraStream,
    cameraConfig,
    updateCameraConfig,
  };
}