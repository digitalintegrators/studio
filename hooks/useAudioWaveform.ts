import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAudioWaveformOptions {
  samples?: number;
}

export interface UseAudioWaveformReturn {
  peaks: number[];
  isGenerating: boolean;
  error: string | null;
  regenerate: () => void;
}

const waveformCache = new Map<string, number[]>();

function normalizePeaks(peaks: number[]): number[] {
  const max = Math.max(...peaks, 0.001);
  return peaks.map((peak) => Math.max(0.04, Math.min(1, peak / max)));
}

async function decodeAudioFromUrl(audioUrl: string): Promise<AudioBuffer> {
  const response = await fetch(audioUrl);

  if (!response.ok) {
    throw new Error(`No se pudo leer el audio del video. HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const AudioCtx = window.AudioContext ||
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    throw new Error("AudioContext no está disponible en este navegador.");
  }

  const audioContext = new AudioCtx();

  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return decoded;
  } finally {
    if (audioContext.state !== "closed") {
      await audioContext.close().catch(() => undefined);
    }
  }
}

function buildPeaks(audioBuffer: AudioBuffer, samples: number): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const safeSamples = Math.max(24, samples);
  const blockSize = Math.max(1, Math.floor(channelData.length / safeSamples));
  const peaks: number[] = [];

  for (let i = 0; i < safeSamples; i += 1) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);
    let sum = 0;

    for (let j = start; j < end; j += 1) {
      sum += channelData[j] * channelData[j];
    }

    const rms = Math.sqrt(sum / Math.max(1, end - start));
    peaks.push(rms);
  }

  return normalizePeaks(peaks);
}

export function useAudioWaveform(
  audioUrl: string | null,
  duration: number,
  options: UseAudioWaveformOptions = {}
): UseAudioWaveformReturn {
  const { samples = 140 } = options;
  const [peaks, setPeaks] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const cacheKey = audioUrl ? `${audioUrl}:${Math.round(duration)}:${samples}` : null;

  const generate = useCallback(async (force = false) => {
    if (!audioUrl || duration <= 0 || typeof window === "undefined") {
      setPeaks([]);
      setIsGenerating(false);
      return;
    }

    if (cacheKey && !force) {
      const cached = waveformCache.get(cacheKey);
      if (cached?.length) {
        setPeaks(cached);
        setIsGenerating(false);
        setError(null);
        return;
      }
    }

    abortRef.current = false;
    setIsGenerating(true);
    setError(null);

    try {
      const audioBuffer = await decodeAudioFromUrl(audioUrl);

      if (abortRef.current) return;

      const nextPeaks = buildPeaks(audioBuffer, samples);

      if (abortRef.current) return;

      if (cacheKey) {
        waveformCache.set(cacheKey, nextPeaks);
      }

      setPeaks(nextPeaks);
    } catch (err) {
      if (!abortRef.current) {
        console.warn("No se pudo generar waveform:", err);
        setPeaks([]);
        setError(err instanceof Error ? err.message : "No se pudo generar waveform.");
      }
    } finally {
      if (!abortRef.current) {
        setIsGenerating(false);
      }
    }
  }, [audioUrl, duration, samples, cacheKey]);

  useEffect(() => {
    setPeaks([]);
    generate(false);

    return () => {
      abortRef.current = true;
    };
  }, [generate]);

  const regenerate = useCallback(() => {
    generate(true);
  }, [generate]);

  return {
    peaks,
    isGenerating,
    error,
    regenerate,
  };
}
