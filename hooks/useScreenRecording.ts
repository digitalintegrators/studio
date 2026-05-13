"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, usePathname } from "@/navigation";
import type { RecordingState } from "@/types";
import type { CameraConfig, RecordingSetupConfig } from "@/types/camera.types";
import type { CursorRecordingData, CursorKeyframe } from "@/types/cursor.types";

import {
  DEFAULT_RECORDING_SETUP,
  requestCameraStream,
  requestMicrophoneStream,
} from "@/types/camera.types";

export type { RecordingState };

const DB_NAME = "openvidDB";
const VIDEO_STORE_NAME = "videos";
const DB_VERSION = 3;

function generateVideoId(): string {
  return `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
      const transaction = db.transaction(VIDEO_STORE_NAME, "readwrite");
      const store = transaction.objectStore(VIDEO_STORE_NAME);
      const getAllKeysRequest = store.getAllKeys();

      getAllKeysRequest.onsuccess = () => {
        const keys = getAllKeysRequest.result;

        keys.forEach((key) => {
          if (key === "currentVideo") return;

          const getRequest = store.get(key);

          getRequest.onsuccess = () => {
            const record = getRequest.result as { timestamp?: number } | undefined;

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
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) {
        db.createObjectStore(VIDEO_STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      cleanupOldRecordings(db).catch(() => undefined);
      resolve(db);
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      reject(
        new Error(
          "La base de datos está bloqueada por otra pestaña. Cierra otras pestañas de Studio y vuelve a intentarlo."
        )
      );
    };
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
  const videoId = generateVideoId();
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VIDEO_STORE_NAME], "readwrite");
    const store = transaction.objectStore(VIDEO_STORE_NAME);

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

    store.put(videoData, videoId);
    store.put(
      {
        videoId,
        timestamp: videoData.timestamp,
      },
      "currentVideo"
    );

    transaction.oncomplete = () => {
      db.close();
      resolve(videoId);
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
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
      const transaction = db.transaction([VIDEO_STORE_NAME], "readonly");
      const store = transaction.objectStore(VIDEO_STORE_NAME);
      const currentRequest = store.get("currentVideo");

      currentRequest.onsuccess = () => {
        const currentData = currentRequest.result;

        if (!currentData) {
          db.close();
          resolve(null);
          return;
        }

        if (currentData?.blob) {
          const cameraBlob: Blob | null = currentData.cameraBlob ?? null;

          db.close();
          resolve({
            blob: currentData.blob,
            duration: currentData.duration ?? 0,
            url: URL.createObjectURL(currentData.blob),
            videoId: currentData.videoId ?? "currentVideo",
            timestamp: currentData.timestamp ?? Date.now(),
            isRecordedVideo: currentData.isRecordedVideo ?? true,
            cameraBlob,
            cameraUrl: cameraBlob ? URL.createObjectURL(cameraBlob) : null,
            cameraConfig: currentData.cameraConfig ?? null,
            cursorData: currentData.cursorData ?? null,
          });
          return;
        }

        const currentVideoId =
          typeof currentData === "string" ? currentData : currentData.videoId;

        if (!currentVideoId) {
          db.close();
          resolve(null);
          return;
        }

        const videoRequest = store.get(currentVideoId);

        videoRequest.onsuccess = () => {
          const data = videoRequest.result;
          db.close();

          if (!data?.blob) {
            resolve(null);
            return;
          }

          const cameraBlob: Blob | null = data.cameraBlob ?? null;

          resolve({
            blob: data.blob,
            duration: data.duration ?? 0,
            url: URL.createObjectURL(data.blob),
            videoId: data.videoId || currentVideoId,
            timestamp: data.timestamp || Date.now(),
            isRecordedVideo: data.isRecordedVideo ?? true,
            cameraBlob,
            cameraUrl: cameraBlob ? URL.createObjectURL(cameraBlob) : null,
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
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VIDEO_STORE_NAME], "readwrite");
    const store = transaction.objectStore(VIDEO_STORE_NAME);
    const currentRequest = store.get("currentVideo");

    currentRequest.onsuccess = () => {
      const currentData = currentRequest.result;

      const currentVideoId =
        typeof currentData === "string" ? currentData : currentData?.videoId;

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

    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function pickSupportedMimeType(preferred: string[]): string | undefined {
  for (const mimeType of preferred) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    } catch {
      // ignore
    }
  }

  return undefined;
}

function formatRecordingTitle(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `Grabando ${mins}:${secs}`;
}

type WindowWithWebkitAudioContext = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

async function buildFinalScreenStream(params: {
  screenStream: MediaStream;
  micStream: MediaStream | null;
  setup: RecordingSetupConfig;
  audioCtxRef: React.MutableRefObject<AudioContext | null>;
}): Promise<MediaStream> {
  const { screenStream, micStream, setup, audioCtxRef } = params;

  const screenVideoTracks = screenStream.getVideoTracks();
  const screenAudioTracks = screenStream.getAudioTracks();
  const micAudioTracks = micStream?.getAudioTracks() ?? [];

  if (micAudioTracks.length === 0) {
    return screenStream;
  }

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as WindowWithWebkitAudioContext).webkitAudioContext;

    if (!AudioCtx) {
      return screenStream;
    }

    const audioCtx = new AudioCtx();
    audioCtxRef.current = audioCtx;

    if (audioCtx.state === "suspended") {
      await audioCtx.resume().catch(() => undefined);
    }

    const destination = audioCtx.createMediaStreamDestination();

    if (screenAudioTracks.length > 0) {
      const screenSource = audioCtx.createMediaStreamSource(
        new MediaStream(screenAudioTracks)
      );

      const screenGain = audioCtx.createGain();
      screenGain.gain.value = 1;

      screenSource.connect(screenGain);
      screenGain.connect(destination);
    }

    if (micAudioTracks.length > 0) {
      const micSource = audioCtx.createMediaStreamSource(
        new MediaStream(micAudioTracks)
      );

      const micGain = audioCtx.createGain();
      micGain.gain.value = setup.microphone.volume ?? 1;

      micSource.connect(micGain);
      micGain.connect(destination);
    }

    return new MediaStream([
      ...screenVideoTracks,
      ...destination.stream.getAudioTracks(),
    ]);
  } catch (error) {
    console.warn("Error al mezclar audio. Se usará el stream original:", error);
    return screenStream;
  }
}

export function useScreenRecording() {
  const [state, setState] = useState<RecordingState>("idle");
  const [countdown, setCountdown] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraConfig, setCameraConfig] = useState<CameraConfig | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraRecorderRef = useRef<MediaRecorder | null>(null);

  const screenChunksRef = useRef<Blob[]>([]);
  const cameraChunksRef = useRef<Blob[]>([]);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const rawScreenStreamRef = useRef<MediaStream | null>(null);
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

  useEffect(() => {
    if (typeof document !== "undefined") {
      originalTitleRef.current = document.title;
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (state === "idle") {
      document.title = originalTitleRef.current || "openvid - Crea tomas cinemáticas";
      return;
    }

    if (state === "countdown") {
      document.title = `Grabando en ${countdown}...`;
      return;
    }

    if (state === "recording") {
      document.title = formatRecordingTitle(recordingTime);
      return;
    }

    if (state === "processing") {
      document.title = "⏳ Procesando video...";
    }
  }, [state, countdown, recordingTime]);

  useEffect(() => {
    if (state !== "recording") return;

    const interval = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [state]);

  const startCursorTracking = useCallback(() => {
    cursorFramesRef.current = [];

    const start = performance.now();

    const pushFrame = (event: MouseEvent, clicking: boolean) => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);

      cursorFramesRef.current.push({
        time: (performance.now() - start) / 1000,
        x: Math.max(0, Math.min(100, (event.clientX / width) * 100)),
        y: Math.max(0, Math.min(100, (event.clientY / height) * 100)),
        state: clicking ? "pointer" : "default",
        clicking,
      });
    };

    const handleMove = (event: MouseEvent) => pushFrame(event, false);
    const handleDown = (event: MouseEvent) => pushFrame(event, true);

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
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    rawScreenStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current?.getTracks().forEach((track) => track.stop());

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => undefined);
    }

    screenStreamRef.current = null;
    rawScreenStreamRef.current = null;
    cameraStreamRef.current = null;
    micStreamRef.current = null;
    audioCtxRef.current = null;

    setCameraStream(null);
    stopCursorTracking();
  }, [stopCursorTracking]);

  const stopRecording = useCallback(() => {
    const screenRecorder = screenRecorderRef.current;
    const cameraRecorder = cameraRecorderRef.current;

    if (screenRecorder && screenRecorder.state !== "inactive") {
      screenRecorder.stop();
    }

    if (cameraRecorder && cameraRecorder.state !== "inactive") {
      cameraRecorder.stop();
    }
  }, []);

  const updateCameraConfig = useCallback((partial: Partial<CameraConfig>) => {
    setCameraConfig((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const startRecording = useCallback(
    (screenStream: MediaStream, camStream: MediaStream | null) => {
      try {
        cursorFramesRef.current = [];
        startCursorTracking();

        screenChunksRef.current = [];
        cameraChunksRef.current = [];
        setRecordingTime(0);

        startTimeRef.current = Date.now();

        const screenMime =
          pickSupportedMimeType([
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
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

        screenRecorder.onerror = (event) => {
          console.error("Error del MediaRecorder de pantalla:", event);
          setError("Error durante la grabación de pantalla.");
          cleanupStreams();
          setState("idle");
        };

        let cameraRecorder: MediaRecorder | null = null;

        if (camStream) {
          const camMime =
            pickSupportedMimeType([
              "video/webm;codecs=vp9,opus",
              "video/webm;codecs=vp8,opus",
              "video/webm;codecs=vp9",
              "video/webm;codecs=vp8",
              "video/webm",
            ]) || undefined;

          cameraRecorder = new MediaRecorder(
            camStream,
            camMime ? { mimeType: camMime } : undefined
          );

          cameraRecorderRef.current = cameraRecorder;

          cameraRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              cameraChunksRef.current.push(event.data);
            }
          };

          cameraRecorder.onerror = (event) => {
            console.error("Error del MediaRecorder de cámara:", event);
          };
        }

        let pendingCount = cameraRecorder ? 2 : 1;
        let screenBlob: Blob | null = null;
        let cameraBlob: Blob | null = null;
        let finalized = false;

        const finalize = async () => {
          if (finalized) return;
          finalized = true;

          setState("processing");

          const duration = Math.max(0.1, (Date.now() - startTimeRef.current) / 1000);
          const videoTrackSettings = screenStream.getVideoTracks()[0]?.getSettings();

          stopCursorTracking();

          const cursorData: CursorRecordingData = {
            hasCursorData: cursorFramesRef.current.length > 0,
            keyframes: cursorFramesRef.current,
            videoDimensions: {
              width: videoTrackSettings?.width ?? 1920,
              height: videoTrackSettings?.height ?? 1080,
            },
            frameRate: videoTrackSettings?.frameRate ?? 30,
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

            if (pathname.endsWith("/editor")) {
              window.location.reload();
            } else {
              router.push("/editor");
            }
          } catch (err) {
            console.error("Error al guardar video:", err);
            setError("Error al guardar el video.");
            setState("idle");
          }
        };

        screenRecorder.onstop = () => {
          screenBlob = new Blob(screenChunksRef.current, {
            type: screenRecorder.mimeType || screenMime || "video/webm",
          });

          pendingCount -= 1;

          if (pendingCount <= 0) {
            finalize();
          }
        };

        if (cameraRecorder) {
          cameraRecorder.onstop = () => {
            cameraBlob = new Blob(cameraChunksRef.current, {
              type: cameraRecorder?.mimeType || "video/webm",
            });

            pendingCount -= 1;

            if (pendingCount <= 0) {
              finalize();
            }
          };
        }

        const screenVideoTrack = screenStream.getVideoTracks()[0];

        if (screenVideoTrack) {
          screenVideoTrack.onended = () => {
            if (stateRef.current === "recording") {
              stopRecording();
            } else {
              cleanupStreams();
              setState("idle");
            }
          };
        }

        setState("recording");

        window.setTimeout(() => {
          startTimeRef.current = Date.now();
          screenRecorder.start(1000);
          cameraRecorder?.start(1000);
        }, 300);
      } catch (err) {
        console.error("Error al iniciar grabación:", err);
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
      stopRecording,
    ]
  );

  const startCountdown = useCallback(
    async (setupArg?: RecordingSetupConfig) => {
      const setup = setupArg ?? DEFAULT_RECORDING_SETUP;

      try {
        setError(null);
        setRecordingTime(0);

        if (!navigator.mediaDevices?.getDisplayMedia) {
          setError(
            "Tu navegador no soporta grabación de pantalla. Usa Chrome, Edge o un navegador compatible."
          );
          return;
        }

        const displayMediaOptions: DisplayMediaStreamOptions & {
          preferCurrentTab?: boolean;
          selfBrowserSurface?: "include" | "exclude";
          systemAudio?: "include" | "exclude";
          surfaceSwitching?: "include" | "exclude";
        } = {
          video: {
            displaySurface: "browser",
          } as MediaTrackConstraints,
          audio: setup.systemAudio
            ? ({
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                suppressLocalAudioPlayback: false,
              } as MediaTrackConstraints)
            : false,
          preferCurrentTab: true,
          selfBrowserSurface: "include",
          systemAudio: setup.systemAudio ? "include" : "exclude",
          surfaceSwitching: "include",
        };

        const rawScreenStream =
          await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

        rawScreenStreamRef.current = rawScreenStream;
        screenStreamRef.current = rawScreenStream;

        let camStream: MediaStream | null = null;

        if (setup.camera.enabled) {
          try {
            camStream = await requestCameraStream(setup.camera.deviceId);
            cameraStreamRef.current = camStream;
            setCameraStream(camStream);
            setCameraConfig(setup.camera);
          } catch (err) {
            console.warn("Cámara denegada, continuando sin cámara:", err);
            setCameraConfig(null);
          }
        } else {
          setCameraConfig(null);
        }

        let micStream: MediaStream | null = null;

        if (setup.microphone.enabled) {
          try {
            micStream = await requestMicrophoneStream(setup.microphone.deviceId, {
              noiseSuppression: setup.microphone.noiseSuppression,
              echoCancellation: setup.microphone.echoCancellation,
            });

            micStreamRef.current = micStream;
          } catch (err) {
            console.warn("Micrófono denegado, continuando sin micrófono:", err);
          }
        }

        const finalScreenStream = await buildFinalScreenStream({
          screenStream: rawScreenStream,
          micStream,
          setup,
          audioCtxRef,
        });

        screenStreamRef.current = finalScreenStream;

        const screenVideoTrack = finalScreenStream.getVideoTracks()[0];

        if (screenVideoTrack) {
          screenVideoTrack.onended = () => {
            if (stateRef.current === "recording") {
              stopRecording();
            } else {
              cleanupStreams();
              setState("idle");
            }
          };
        }

        setState("countdown");
        setCountdown(3);

        let count = 3;

        const interval = window.setInterval(() => {
          count -= 1;
          setCountdown(count);

          if (count <= 0) {
            window.clearInterval(interval);
            startRecording(finalScreenStream, camStream);
          }
        }, 1000);
      } catch (err) {
        console.error("Error al iniciar captura:", err);
        setError(getPermissionErrorMessage(err));
        cleanupStreams();
        setState("idle");
      }
    },
    [cleanupStreams, startRecording, stopRecording]
  );

  const cancelRecording = useCallback(() => {
    stopRecording();
    cleanupStreams();

    screenChunksRef.current = [];
    cameraChunksRef.current = [];
    cursorFramesRef.current = [];

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
