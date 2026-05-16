export type CaptionStylePreset = "minimal" | "cinematic" | "bold" | "creator";

export interface CaptionWord {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface CaptionSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  words?: CaptionWord[];
}

export interface CaptionSettings {
  enabled: boolean;
  preset: CaptionStylePreset;
  positionY: number;
  fontSize: number;
  maxWidth: number;
  showWordHighlight: boolean;
  backgroundOpacity: number;
}

export interface CaptionEditorState {
  segments: CaptionSegment[];
  settings: CaptionSettings;
}

export const DEFAULT_CAPTION_SETTINGS: CaptionSettings = {
  enabled: true,
  preset: "cinematic",
  positionY: 82,
  fontSize: 42,
  maxWidth: 78,
  showWordHighlight: true,
  backgroundOpacity: 0.38,
};

export const EMPTY_CAPTION_EDITOR_STATE: CaptionEditorState = {
  segments: [],
  settings: DEFAULT_CAPTION_SETTINGS,
};

export function createCaptionWords(text: string, startTime: number, endTime: number, idPrefix = "caption-word"): CaptionWord[] {
  const rawWords = text.split(/\s+/).map((word) => word.trim()).filter(Boolean);
  const duration = Math.max(0.4, endTime - startTime);
  const wordDuration = duration / Math.max(1, rawWords.length);

  return rawWords.map((word, index) => ({
    id: `${idPrefix}-word-${index + 1}`,
    text: word,
    startTime: startTime + index * wordDuration,
    endTime: Math.min(endTime, startTime + (index + 1) * wordDuration),
  }));
}

export function createDemoCaptionSegments(duration: number): CaptionSegment[] {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 18;
  const items = [
    "Crea demos más claras en menos tiempo.",
    "Resalta lo importante con zoom, máscara y spotlight.",
    "Exporta una toma que parece producida.",
  ];

  const segmentDuration = Math.max(2.4, Math.min(4.2, safeDuration / 5));
  const start = Math.max(0.4, Math.min(1.2, safeDuration * 0.05));

  return items.map((text, index) => {
    const startTime = Math.min(safeDuration - 0.4, start + index * (segmentDuration + 0.5));
    const endTime = Math.min(safeDuration, startTime + segmentDuration);
    const rawWords = text.split(/\s+/).filter(Boolean);
    const wordDuration = Math.max(0.18, (endTime - startTime) / Math.max(1, rawWords.length));
    const words = rawWords.map((word, wordIndex) => ({
      id: `caption-demo-${index + 1}-word-${wordIndex + 1}`,
      text: word,
      startTime: startTime + wordIndex * wordDuration,
      endTime: Math.min(endTime, startTime + (wordIndex + 1) * wordDuration),
    }));

    return {
      id: `caption-demo-${index + 1}`,
      startTime,
      endTime,
      text,
      words,
    };
  });
}

export function getActiveCaptionSegment(segments: CaptionSegment[], currentTime: number): CaptionSegment | null {
  return segments.find((segment) => currentTime >= segment.startTime && currentTime <= segment.endTime) ?? null;
}

export function getActiveCaptionWord(segment: CaptionSegment | null, currentTime: number): CaptionWord | null {
  if (!segment?.words?.length) return null;
  return segment.words.find((word) => currentTime >= word.startTime && currentTime <= word.endTime) ?? null;
}
