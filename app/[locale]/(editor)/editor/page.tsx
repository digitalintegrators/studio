"use client";

import { useState, useRef, useEffect, useCallback, lazy, Suspense, useMemo } from "react";
import { toBlob } from 'html-to-image';
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { loadVideoFromIndexedDB, deleteRecordedVideo } from "@/hooks/useScreenRecording";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useImageProjects } from "@/hooks/useImageProjects";
import { getUploadedVideo, deleteUploadedVideo } from "@/lib/video-upload-cache";
import { getUploadedImage, deleteUploadedImage } from "@/lib/image-upload-cache";
import { useEditorMode } from "@/hooks/useEditorMode";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useVideoExport } from "@/hooks/useVideoExport";
import { useVideoThumbnails, type VideoThumbnail } from "@/hooks/useVideoThumbnails";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { clearAllThumbnailCache } from "@/lib/thumbnail-cache";
import { addVideoToLibrary, addVideoToLibraryWithMetadata, getLibraryVideoCount, getLibraryVideo, findExistingVideo } from "@/lib/videos-library";
import { calculateTotalDuration, findNextClipPosition, getClipAtTime, type VideoTrackClip } from "@/types/video-track.types";
import type { ExportQuality, Tool, BackgroundTab, VideoCanvasHandle, BackgroundColorConfig, AspectRatio, CropArea, ZoomFragment, ImageExportFormat } from "@/types";
import type { AudioTrack, UploadedAudio } from "@/types/audio.types";
import { MAX_AUDIO_TRACKS } from "@/types/audio.types";
import type { TrimRange } from "@/types/timeline.types";
import type { MockupConfig } from "@/types/mockup.types";
import type { EditorState } from "@/types/editor-state.types";
import { createInitialEditorState } from "@/types/editor-state.types";
import { DEFAULT_MOCKUP_CONFIG, getMockupDefaultConfig } from "@/types/mockup.types";
import type { CanvasElement } from "@/types/canvas-elements.types";
import type { CameraConfig } from "@/types/camera.types";
import type { Preview3DConfig, ImageMaskConfig } from "@/types/photo.types";
import { DEFAULT_MASK_CONFIG, PREVIEW_CONFIGS } from "@/types/photo.types";
import { MOCKUPS } from "@/lib/mockup-data";
import { gradientToCss, generateDefaultZoomFragments, createZoomFragment, ASPECT_RATIO_DIMENSIONS } from "@/types";
import type { SpotlightFragment } from "@/types/spotlight.types";
import { createSpotlightFragment, DEFAULT_SPOTLIGHT_DURATION } from "@/types/spotlight.types";
import type { EditableMaskFragment, EditableMaskPreset } from "@/types/mask-fragment.types";
import {
    applyMaskPresetDefaults,
    createEditableMaskFragment,
    DEFAULT_MASK_FRAGMENT_DURATION,
    MASK_PRESET_LABELS,
} from "@/types/mask-fragment.types";
import { ToolsSidebar } from "@/app/components/ui/editor/ToolsSidebar";
import { MobileToolsMenu } from "@/app/components/ui/editor/MobileToolsMenu";
import { MobileControlPanel } from "@/app/components/ui/editor/MobileControlPanel";
import { EditorTopBar } from "@/app/components/ui/editor/EditorTopBar";
import { VideoCanvas } from "@/app/components/ui/editor/VideoCanvas";
import { PlayerControls } from "@/app/components/ui/editor/PlayerControls";
import { findValidFragmentPosition } from "@/app/components/ui/editor/ZoomFragmentTrackItem";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TimelineSkeleton } from "@/app/components/ui/Skeleton";
import { AudioTrimModal } from "@/app/components/ui/editor/AudioTrimModal";
import { VIDEO_Z_INDEX } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import { TooltipAction } from "@/components/ui/tooltip-action";
import type { CursorConfig, CursorRecordingData } from "@/types/cursor.types";
import { DEFAULT_CURSOR_CONFIG } from "@/types/cursor.types";

const ControlPanel = lazy(() => import("@/app/components/ui/editor/ControlPanel").then(mod => ({ default: mod.ControlPanel })));
const Timeline = lazy(() => import("@/app/components/ui/editor/Timeline").then(mod => ({ default: mod.Timeline })));
const ExportOverlay = lazy(() => import("@/app/components/ui/ExportOverlay").then(mod => ({ default: mod.ExportOverlay })));
const VideoCropperModal = lazy(() => import("@/app/components/ui/editor/VideoCropperModal").then(mod => ({ default: mod.VideoCropperModal })));
const ImageCropperModal = lazy(() => import("@/app/components/ui/editor/ImageCropperModal").then(mod => ({ default: mod.ImageCropperModal })));
const PhotoEditorPlaceholder = lazy(() => import("@/app/components/ui/editor/PhotoEditorPlaceholder").then(mod => ({ default: mod.PhotoEditorPlaceholder })));

const SPOTLIGHT_STORAGE_PREFIX = "openvid-spotlight-fragments";

function getSpotlightStorageKey(videoId: string | null): string | null {
    if (!videoId) return null;
    return `${SPOTLIGHT_STORAGE_PREFIX}:${videoId}`;
}

function loadStoredSpotlightFragments(videoId: string | null): SpotlightFragment[] {
    if (typeof window === "undefined") return [];

    const key = getSpotlightStorageKey(videoId);
    if (!key) return [];

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter((fragment): fragment is SpotlightFragment => {
            return (
                fragment &&
                typeof fragment.id === "string" &&
                typeof fragment.startTime === "number" &&
                typeof fragment.endTime === "number" &&
                typeof fragment.x === "number" &&
                typeof fragment.y === "number" &&
                typeof fragment.width === "number" &&
                typeof fragment.height === "number"
            );
        });
    } catch (error) {
        console.warn("Failed to load spotlight fragments:", error);
        return [];
    }
}

function saveStoredSpotlightFragments(videoId: string | null, fragments: SpotlightFragment[]): void {
    if (typeof window === "undefined") return;

    const key = getSpotlightStorageKey(videoId);
    if (!key) return;

    try {
        if (fragments.length === 0) {
            window.localStorage.removeItem(key);
            return;
        }

        window.localStorage.setItem(key, JSON.stringify(fragments));
    } catch (error) {
        console.warn("Failed to save spotlight fragments:", error);
    }
}

const MASK_STORAGE_PREFIX = "openvid-mask-fragments";

function getMaskStorageKey(videoId: string | null): string | null {
    if (!videoId) return null;
    return `${MASK_STORAGE_PREFIX}:${videoId}`;
}

function loadStoredMaskFragments(videoId: string | null): EditableMaskFragment[] {
    if (typeof window === "undefined") return [];

    const key = getMaskStorageKey(videoId);
    if (!key) return [];

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter((fragment): fragment is EditableMaskFragment => {
            return (
                fragment &&
                typeof fragment.id === "string" &&
                typeof fragment.startTime === "number" &&
                typeof fragment.endTime === "number" &&
                typeof fragment.x === "number" &&
                typeof fragment.y === "number" &&
                typeof fragment.width === "number" &&
                typeof fragment.height === "number"
            );
        });
    } catch (error) {
        console.warn("Failed to load mask fragments:", error);
        return [];
    }
}

function saveStoredMaskFragments(videoId: string | null, fragments: EditableMaskFragment[]): void {
    if (typeof window === "undefined") return;

    const key = getMaskStorageKey(videoId);
    if (!key) return;

    try {
        if (fragments.length === 0) {
            window.localStorage.removeItem(key);
            return;
        }

        window.localStorage.setItem(key, JSON.stringify(fragments));
    } catch (error) {
        console.warn("Failed to save mask fragments:", error);
    }
}


const CAPTION_STORAGE_PREFIX = "studio-caption-state";

function getCaptionStorageKey(videoId: string | null): string | null {
    if (!videoId) return null;
    return `${CAPTION_STORAGE_PREFIX}:${videoId}`;
}

function loadStoredCaptionEditorState(videoId: string | null): CaptionEditorState | null {
    if (typeof window === "undefined") return null;

    const key = getCaptionStorageKey(videoId);
    if (!key) return null;

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<CaptionEditorState>;
        const segments = Array.isArray(parsed.segments)
            ? parsed.segments.filter((segment): segment is CaptionSegment => (
                !!segment &&
                typeof segment.id === "string" &&
                typeof segment.startTime === "number" &&
                typeof segment.endTime === "number" &&
                typeof segment.text === "string"
            ))
            : [];

        return {
            segments,
            settings: {
                ...DEFAULT_CAPTION_SETTINGS,
                ...(parsed.settings ?? {}),
            },
        };
    } catch (error) {
        console.warn("Failed to load caption editor state:", error);
        return null;
    }
}

function saveStoredCaptionEditorState(videoId: string | null, state: CaptionEditorState): void {
    if (typeof window === "undefined") return;

    const key = getCaptionStorageKey(videoId);
    if (!key) return;

    try {
        if (state.segments.length === 0 && JSON.stringify(state.settings) === JSON.stringify(DEFAULT_CAPTION_SETTINGS)) {
            window.localStorage.removeItem(key);
            return;
        }

        window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
        console.warn("Failed to save caption editor state:", error);
    }
}

const ZOOM_STORAGE_PREFIX = "openvid-zoom-fragments";
const AUDIO_STORAGE_PREFIX = "openvid-audio-state";

type StoredUploadedAudio = Omit<UploadedAudio, "url">;

type StoredAudioEditorState = {
    audioTracks: AudioTrack[];
    uploadedAudios: StoredUploadedAudio[];
    muteOriginalAudio: boolean;
    masterVolume: number;
};

function getZoomStorageKey(videoId: string | null): string | null {
    if (!videoId) return null;
    return `${ZOOM_STORAGE_PREFIX}:${videoId}`;
}

function getAudioStorageKey(videoId: string | null): string | null {
    if (!videoId) return null;
    return `${AUDIO_STORAGE_PREFIX}:${videoId}`;
}

function loadStoredZoomFragments(videoId: string | null): ZoomFragment[] | null {
    if (typeof window === "undefined") return null;

    const key = getZoomStorageKey(videoId);
    if (!key) return null;

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;

        const fragments = parsed.filter((fragment): fragment is ZoomFragment => {
            return (
                fragment &&
                typeof fragment.id === "string" &&
                typeof fragment.startTime === "number" &&
                typeof fragment.endTime === "number" &&
                typeof fragment.zoomLevel === "number" &&
                typeof fragment.focusX === "number" &&
                typeof fragment.focusY === "number"
            );
        });

        return fragments.length > 0 ? fragments : null;
    } catch (error) {
        console.warn("Failed to load zoom fragments:", error);
        return null;
    }
}

function saveStoredZoomFragments(videoId: string | null, fragments: ZoomFragment[]): void {
    if (typeof window === "undefined") return;

    const key = getZoomStorageKey(videoId);
    if (!key) return;

    try {
        if (fragments.length === 0) {
            window.localStorage.removeItem(key);
            return;
        }

        window.localStorage.setItem(key, JSON.stringify(fragments));
    } catch (error) {
        console.warn("Failed to save zoom fragments:", error);
    }
}


function openEditorAudioDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("studio-editor-audio-cache", 1);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("audioBlobs")) {
                db.createObjectStore("audioBlobs", { keyPath: "key" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getStoredAudioBlobKey(videoId: string, audioId: string): string {
    return `${videoId}:${audioId}`;
}

async function saveStoredAudioBlob(videoId: string | null, audioId: string, file: File): Promise<void> {
    if (!videoId || typeof indexedDB === "undefined") return;

    try {
        const db = await openEditorAudioDatabase();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction("audioBlobs", "readwrite");
            transaction.objectStore("audioBlobs").put({
                key: getStoredAudioBlobKey(videoId, audioId),
                blob: file,
            });
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
        db.close();
    } catch (error) {
        console.warn("Failed to persist audio blob:", error);
    }
}

async function loadStoredAudioBlob(videoId: string, audioId: string): Promise<Blob | null> {
    if (typeof indexedDB === "undefined") return null;

    try {
        const db = await openEditorAudioDatabase();
        const result = await new Promise<{ blob?: Blob } | undefined>((resolve, reject) => {
            const transaction = db.transaction("audioBlobs", "readonly");
            const request = transaction.objectStore("audioBlobs").get(getStoredAudioBlobKey(videoId, audioId));
            request.onsuccess = () => resolve(request.result as { blob?: Blob } | undefined);
            request.onerror = () => reject(request.error);
        });
        db.close();
        return result?.blob ?? null;
    } catch (error) {
        console.warn("Failed to load persisted audio blob:", error);
        return null;
    }
}

async function restoreStoredUploadedAudios(videoId: string | null, audios: StoredUploadedAudio[]): Promise<UploadedAudio[]> {
    if (!videoId || audios.length === 0) return [];

    const restored = await Promise.all(
        audios.map(async (audio) => {
            const blob = await loadStoredAudioBlob(videoId, audio.id);
            if (!blob) return null;

            return {
                ...audio,
                url: URL.createObjectURL(blob),
            } satisfies UploadedAudio;
        })
    );

    return restored.filter((audio): audio is UploadedAudio => audio !== null);
}

function loadStoredAudioEditorState(videoId: string | null): StoredAudioEditorState | null {
    if (typeof window === "undefined") return null;

    const key = getAudioStorageKey(videoId);
    if (!key) return null;

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<StoredAudioEditorState>;
        if (!parsed || !Array.isArray(parsed.audioTracks)) return null;

        const audioTracks = parsed.audioTracks.filter((track): track is AudioTrack => {
            return (
                track &&
                typeof track.id === "string" &&
                typeof track.audioId === "string" &&
                typeof track.name === "string" &&
                typeof track.startTime === "number" &&
                typeof track.duration === "number" &&
                typeof track.volume === "number" &&
                typeof track.loop === "boolean"
            );
        });

        const uploadedAudios = Array.isArray(parsed.uploadedAudios)
            ? parsed.uploadedAudios.filter((audio): audio is StoredUploadedAudio => {
                return (
                    audio &&
                    typeof audio.id === "string" &&
                    typeof audio.name === "string" &&
                    typeof audio.duration === "number" &&
                    typeof audio.fileSize === "number" &&
                    typeof audio.mimeType === "string"
                );
            })
            : [];

        return {
            audioTracks,
            uploadedAudios,
            muteOriginalAudio: parsed.muteOriginalAudio === true,
            masterVolume: typeof parsed.masterVolume === "number" ? Math.max(0, Math.min(1, parsed.masterVolume)) : 1,
        };
    } catch (error) {
        console.warn("Failed to load audio editor state:", error);
        return null;
    }
}

function saveStoredAudioEditorState(videoId: string | null, state: StoredAudioEditorState): void {
    if (typeof window === "undefined") return;

    const key = getAudioStorageKey(videoId);
    if (!key) return;

    try {
        const isDefaultAudioState =
            state.audioTracks.length === 0 &&
            state.uploadedAudios.length === 0 &&
            state.muteOriginalAudio === false &&
            state.masterVolume === 1;

        if (isDefaultAudioState) {
            window.localStorage.removeItem(key);
            return;
        }

        window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
        console.warn("Failed to save audio editor state:", error);
    }
}

function getStoredOrDefaultZoomFragments(videoId: string | null, duration: number): ZoomFragment[] {
    return loadStoredZoomFragments(videoId) ?? generateDefaultZoomFragments(duration);
}

export default function Editor() {
    // Editor mode (video/photo) from URL params
    const { mode: editorMode, isVideoMode, isPhotoMode } = useEditorMode();

    // Undo/Redo system - centralized state management
    const {
        state: editorState,
        setState: setEditorState,
        undo,
        redo,
        canUndo,
        canRedo,
        clearHistory,
    } = useUndoRedo<EditorState>(createInitialEditorState());

    // Image state for photo mode
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [imageExportProgress, setImageExportProgress] = useState<{
        status: "idle" | "preparing" | "rendering" | "complete" | "error";
        progress: number;
        message: string;
    }>({
        status: "idle",
        progress: 0,
        message: "",
    });

    // Screen capture hook
    const { captureScreen, isCapturing } = useScreenCapture();

    // Image projects system (IndexedDB persistence for photo mode)
    const {
        projects: imageProjects,
        currentProject,
        isLoading: isLoadingProjects,
        isSaving: isSavingProject,
        createProject,
        saveCurrentProject,
        switchToProject,
        removeProject,
    } = useImageProjects();

    // Photo mode 3D preview state
    const [selectedPreviewId, setSelectedPreviewId] = useState<string>("front");
    const [canvasImageUrl, setCanvasImageUrl] = useState<string | null>(null);
    const [imageTransform, setImageTransform] = useState<Preview3DConfig>({
        id: "front",
        label: "Front",
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        translateY: 0,
        scale: 0.9,
        perspective: 600,
    });
    const [apply3DToBackground, setApply3DToBackground] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [imageMaskConfig, setImageMaskConfig] = useState<ImageMaskConfig>(DEFAULT_MASK_CONFIG);
    const [videoMaskConfig, setVideoMaskConfig] = useState<ImageMaskConfig>(DEFAULT_MASK_CONFIG);

    const [activeTool, setActiveTool] = useState<Tool>("screenshot");
    const [elementsTextTabTrigger, setElementsTextTabTrigger] = useState(0);
    const [backgroundTab, setBackgroundTab] = useState<BackgroundTab>("wallpaper");
    const [selectedWallpaper, setSelectedWallpaper] = useState(0);
    const [backgroundBlur, setBackgroundBlur] = useState(0);
    const [padding, setPadding] = useState(10);
    const [roundedCorners, setRoundedCorners] = useState(10);
    const [shadows, setShadows] = useState(10);
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);
    const [isMobileControlPanelOpen, setIsMobileControlPanelOpen] = useState(false);

    // Video transform state (rotation and position)
    const [videoTransform, setVideoTransform] = useState<{ rotation: number; translateX: number; translateY: number }>({
        rotation: 0,
        translateX: 0,
        translateY: 0,
    });

    // Custom background images
    const [uploadedImages, setUploadedImages] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem("openvid-uploaded-images");
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        return parsed;
                    }
                } catch (error) {
                    console.error("Error loading uploaded images:", error);
                }
            }
        }
        return [];
    });
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
    const [unsplashBgUrl, setUnsplashBgUrl] = useState<string>("");

    // Background color/gradient state
    const [backgroundColorConfig, setBackgroundColorConfig] = useState<BackgroundColorConfig | null>(null);

    // Aspect ratio, fullscreen, and cropper state
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("auto");
    const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
    const [customDimensions, setCustomDimensions] = useState<{ width: number; height: number } | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [cropArea, setCropArea] = useState<CropArea | undefined>(undefined);

    // Computed: which dimensions to use for the canvas
    const customAspectRatio = aspectRatio === "auto"
        ? (isPhotoMode ? imageDimensions : videoDimensions)
        : (aspectRatio === "custom" ? customDimensions : null);

    // Refs for fullscreen
    const editorAreaRef = useRef<HTMLDivElement>(null);
    const clipSwitchTimeRef = useRef<number | null>(null);
    const isSeekingToClipRef = useRef<boolean>(false);

    // Video state
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoId, setVideoId] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<VideoCanvasHandle>(null);
    const isSwitchingClipRef = useRef<boolean>(false);

    // Timeline state
    const [timelineZoom, setTimelineZoom] = useState<number>(1);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);
    const [trimRange, setTrimRange] = useState<TrimRange>({ start: 0, end: 0 });
    const animationFrameRef = useRef<number | null>(null);
    const justEndedRef = useRef<boolean>(false);
    const wasPlayingBeforeDragRef = useRef<boolean>(false);
    const isExportingRef = useRef(false);
    const [scrubTime, setScrubTime] = useState<number>(0);
    // Ref that is always in sync with scrubTime — avoids stale closure in handlePlayheadDragEnd
    const scrubTimeRef = useRef<number>(0);

    // Zoom fragments state
    const [zoomFragments, setZoomFragments] = useState<ZoomFragment[]>([]);
    const [selectedZoomFragmentId, setSelectedZoomFragmentId] = useState<string | null>(null);

    // Spotlight fragments state
    const [spotlightFragments, setSpotlightFragments] = useState<SpotlightFragment[]>([]);
    const [selectedSpotlightFragmentId, setSelectedSpotlightFragmentId] = useState<string | null>(null);

    // Editable mask fragments state
    const [maskFragments, setMaskFragments] = useState<EditableMaskFragment[]>([]);
    const [selectedMaskFragmentId, setSelectedMaskFragmentId] = useState<string | null>(null);
    const [effectInsertMode, setEffectInsertMode] = useState<"spotlight" | "mask">("mask");

    const [captionSegments, setCaptionSegments] = useState<CaptionSegment[]>([]);
    const [captionSettings, setCaptionSettings] = useState<CaptionSettings>(DEFAULT_CAPTION_SETTINGS);
    const [selectedCaptionSegmentId, setSelectedCaptionSegmentId] = useState<string | null>(null);

    const selectedCaptionSegment = useMemo(() => {
        return captionSegments.find((segment) => segment.id === selectedCaptionSegmentId) ?? null;
    }, [captionSegments, selectedCaptionSegmentId]);

    const handleSelectCaptionSegment = useCallback((segmentId: string | null) => {
        setSelectedCaptionSegmentId(segmentId);
        if (segmentId) {
            setSelectedZoomFragmentId(null);
            setSelectedSpotlightFragmentId(null);
            setSelectedMaskFragmentId(null);
            setSelectedAudioTrackId(null);
            setSelectedElementId(null);
        }
    }, []);

    const handleUpdateCaptionSegment = useCallback((segmentId: string, updates: Partial<CaptionSegment>) => {
        setCaptionSegments((prev) => prev.map((segment) => (
            segment.id === segmentId ? { ...segment, ...updates } : segment
        )));
    }, []);

    const handleDeleteCaptionSegment = useCallback((segmentId: string) => {
        setCaptionSegments((prev) => prev.filter((segment) => segment.id !== segmentId));
        setSelectedCaptionSegmentId((current) => current === segmentId ? null : current);
    }, []);

    const handleAddDemoCaptions = useCallback(() => {
        const segments = createDemoCaptionSegments(videoDuration || 18);
        setCaptionSegments(segments);
        setCaptionSettings((prev) => ({ ...DEFAULT_CAPTION_SETTINGS, ...prev, enabled: true }));
        setSelectedCaptionSegmentId(segments[0]?.id ?? null);
        setActiveTool("captions");
    }, [videoDuration]);

    const handleUpdateCaptionSettings = useCallback((updates: Partial<CaptionSettings>) => {
        setCaptionSettings((prev) => ({ ...prev, ...updates }));
    }, []);


    useEffect(() => {
        if (!selectedSpotlightFragmentId && !selectedMaskFragmentId) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            if (
                target.closest("[data-effect-editor-panel]") ||
                target.closest("[data-effect-interactive]") ||
                target.closest("[data-video-canvas-effect]") ||
                target.closest("[data-canvas-element]") ||
                target.closest("[data-camera-overlay]")
            ) {
                return;
            }

            setSelectedSpotlightFragmentId(null);
            setSelectedMaskFragmentId(null);
        };

        window.addEventListener("pointerdown", handlePointerDown, true);
        return () => window.removeEventListener("pointerdown", handlePointerDown, true);
    }, [selectedSpotlightFragmentId, selectedMaskFragmentId]);


    // Ref to always have the latest zoomFragments value (prevents stale closures)
    const zoomFragmentsRef = useRef<ZoomFragment[]>([]);
    useEffect(() => {
        zoomFragmentsRef.current = zoomFragments;
    }, [zoomFragments]);

    useEffect(() => {
        if (!videoId) return;

        saveStoredZoomFragments(videoId, zoomFragments);
    }, [videoId, zoomFragments]);

    useEffect(() => {
        if (!videoId) return;

        saveStoredSpotlightFragments(videoId, spotlightFragments);
    }, [videoId, spotlightFragments]);

    useEffect(() => {
        if (!videoId) return;

        saveStoredMaskFragments(videoId, maskFragments);
    }, [videoId, maskFragments]);

    useEffect(() => {
        if (!videoId) return;

        saveStoredCaptionEditorState(videoId, {
            segments: captionSegments,
            settings: captionSettings,
        });
    }, [captionSegments, captionSettings, videoId]);

    // Mockup state
    const [mockupId, setMockupId] = useState<string>("none");
    const [mockupConfig, setMockupConfig] = useState<MockupConfig>(DEFAULT_MOCKUP_CONFIG);

    // Canvas elements state
    const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

    // Audio state
    const [uploadedAudios, setUploadedAudios] = useState<UploadedAudio[]>([]);
    const [audioTracks, setAudioTracks] = useState<import("@/types/audio.types").AudioTrack[]>([]);
    const [muteOriginalAudio, setMuteOriginalAudio] = useState<boolean>(false);
    const [masterVolume, setMasterVolume] = useState<number>(1);
    const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<string | null>(null);
    // Whether the currently loaded source video file contains an audio stream
    const [videoHasAudioTrack, setVideoHasAudioTrack] = useState<boolean>(true);

    useEffect(() => {
        if (!videoId) return;

        saveStoredAudioEditorState(videoId, {
            audioTracks,
            uploadedAudios: uploadedAudios.map(({ url: _url, ...audio }) => audio),
            muteOriginalAudio,
            masterVolume,
        });
    }, [audioTracks, masterVolume, muteOriginalAudio, uploadedAudios, videoId]);

    const [isRecordedVideo, setIsRecordedVideo] = useState<boolean>(false);
    const [cursorConfig, setCursorConfig] =
        useState<CursorConfig>(DEFAULT_CURSOR_CONFIG);

    const [cursorData, setCursorData] =
        useState<CursorRecordingData | undefined>(undefined);

    const handleCursorConfigChange = useCallback(
        (partial: Partial<CursorConfig>) => {
            setCursorConfig((prev) => ({
                ...prev,
                ...partial,
            }));
        },
        []
    );

    // Camera overlay state (from recorded video's camera track, or post-record adjustments)
    const [cameraConfig, setCameraConfig] = useState<CameraConfig | null>(null);
    const [cameraUrl, setCameraUrl] = useState<string | null>(null);

    const handleCameraConfigChange = useCallback((partial: Partial<CameraConfig>) => {
        setCameraConfig((prev) => (prev ? { ...prev, ...partial } : prev));
    }, []);

    const handleCameraClick = useCallback(() => {
        setActiveTool("camera");
    }, []);

    // Auto-save current image project when configurations change
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isRestoringProjectRef = useRef(false);
    const isLoadingFromCacheRef = useRef(false);
    const lastRestoredProjectIdRef = useRef<string | null>(null);

    const autoSaveCurrentProject = useCallback(async () => {
        if (!isPhotoMode || !imageUrl || !currentProject) return;

        // Don't auto-save during project restoration
        if (isRestoringProjectRef.current) return;

        // Debounce saves to avoid excessive writes
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(async () => {
            try {
                await saveCurrentProject({
                    backgroundTab,
                    selectedWallpaper,
                    backgroundBlur,
                    selectedImageUrl,
                    backgroundColorConfig,
                    padding,
                    roundedCorners,
                    shadows,
                    aspectRatio,
                    customDimensions,
                    cropArea,
                    mockupId,
                    mockupConfig,
                    canvasElements,
                    imageTransform: {
                        rotation: videoTransform.rotation,
                        translateX: videoTransform.translateX,
                        translateY: videoTransform.translateY,
                    },
                    imagePreview3D: imageTransform,
                    apply3DToBackground,
                    imageMaskConfig,
                });
            } catch (error) {
                console.error("Auto-save failed:", error);
            }
        }, 3000); // 3 second debounce
    }, [
        isPhotoMode,
        imageUrl,
        currentProject,
        saveCurrentProject,
        backgroundTab,
        selectedWallpaper,
        backgroundBlur,
        selectedImageUrl,
        backgroundColorConfig,
        padding,
        roundedCorners,
        shadows,
        aspectRatio,
        customDimensions,
        cropArea,
        mockupId,
        mockupConfig,
        canvasElements,
        videoTransform,
        imageTransform,
        apply3DToBackground,
        imageMaskConfig,
    ]);

    useEffect(() => {
        if (currentProject && isPhotoMode && !isRestoringProjectRef.current) {
            autoSaveCurrentProject();
        }
    }, [
        backgroundTab,
        selectedWallpaper,
        backgroundBlur,
        selectedImageUrl,
        backgroundColorConfig,
        padding,
        roundedCorners,
        shadows,
        aspectRatio,
        customDimensions,
        cropArea,
        mockupId,
        mockupConfig,
        canvasElements,
        videoTransform,
        imageTransform,
        apply3DToBackground,
        imageMaskConfig,
        currentProject,
        isPhotoMode,
        autoSaveCurrentProject,
    ]);

    // Restore current project when project ID changes (not on every currentProject update)
    useEffect(() => {
        if (!isPhotoMode || !currentProject) return;

        if (lastRestoredProjectIdRef.current === currentProject.id) return;

        isRestoringProjectRef.current = true;
        lastRestoredProjectIdRef.current = currentProject.id;

        const imageDataUrl = currentProject.imageDataUrl;

        if (!imageDataUrl) {
            console.error("Project missing imageDataUrl");
            isRestoringProjectRef.current = false;
            return;
        }

        // Directly restore all states using the data URL
        setImageUrl(imageDataUrl);
        setBackgroundTab(currentProject.backgroundTab);
        setSelectedWallpaper(currentProject.selectedWallpaper);
        setBackgroundBlur(currentProject.backgroundBlur);
        setSelectedImageUrl(currentProject.selectedImageUrl);
        setBackgroundColorConfig(currentProject.backgroundColorConfig);
        setPadding(currentProject.padding);
        setRoundedCorners(currentProject.roundedCorners);
        setShadows(currentProject.shadows);
        setAspectRatio(currentProject.aspectRatio);
        setCustomDimensions(currentProject.customDimensions);
        setCropArea(currentProject.cropArea);
        setMockupId(currentProject.mockupId);
        setMockupConfig(currentProject.mockupConfig);
        setCanvasElements(currentProject.canvasElements);
        setVideoTransform(currentProject.imageTransform);
        setImageTransform(currentProject.imagePreview3D);
        setApply3DToBackground(currentProject.apply3DToBackground);
        setImageMaskConfig(currentProject.imageMaskConfig);
        setImageDimensions({
            width: currentProject.imageWidth,
            height: currentProject.imageHeight,
        });

        setTimeout(() => {
            isRestoringProjectRef.current = false;
        }, 500); // 
    }, [currentProject, isPhotoMode]);

    // Image project handlers
    const handleSelectImageProject = useCallback(async (projectId: string) => {
        if (!isPhotoMode) return;

        // Save current project before switching
        if (currentProject && imageUrl) {
            await autoSaveCurrentProject();
        }

        // Load the selected project
        await switchToProject(projectId);
    }, [isPhotoMode, currentProject, imageUrl, autoSaveCurrentProject, switchToProject]);

    const handleAddImageToCanvas = useCallback(async (projectId: string) => {
        await handleSelectImageProject(projectId);
    }, [handleSelectImageProject]);

    const handleDeleteImageProject = useCallback(async (projectId: string) => {
        // If deleting the current project, cancel auto-save and clear state immediately
        const isDeletingCurrent = currentProject?.id === projectId;

        if (isDeletingCurrent) {
            // Cancel any pending auto-save to prevent race condition
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
                autoSaveTimeoutRef.current = null;
            }
        }

        await removeProject(projectId);

        // Clear canvas if we deleted the current project
        if (isDeletingCurrent) {
            setImageUrl(null);
            setCanvasImageUrl(null);
            setImageDimensions(null);
            // Reset to default state
            setBackgroundTab("wallpaper");
            setSelectedWallpaper(0);
            setBackgroundBlur(0);
            setPadding(10);
            setRoundedCorners(10);
            setShadows(10);
            setAspectRatio("auto");
            setCustomDimensions(null);
            setCropArea(undefined);
            setMockupId("none");
            setMockupConfig(DEFAULT_MOCKUP_CONFIG);
            setCanvasElements([]);
            setImageTransform({ id: "front", label: "Front", rotateX: 0, rotateY: 0, rotateZ: 0, translateY: 0, scale: 0.9, perspective: 600 });
            setApply3DToBackground(false);
            setImageMaskConfig(DEFAULT_MASK_CONFIG);
        }
    }, [currentProject, removeProject]);

    const handleUploadImageToHistory = useCallback(async (file: File) => {
        // This will create a new project when user uploads from history menu
        try {
            const img = await createImageBitmap(file);
            const project = await createProject(
                file,
                file.name,
                img.width,
                img.height,
                {
                    backgroundTab,
                    selectedWallpaper,
                    backgroundBlur,
                    selectedImageUrl,
                    backgroundColorConfig,
                    padding,
                    roundedCorners,
                    shadows,
                    aspectRatio,
                    customDimensions,
                    cropArea,
                    mockupId,
                    mockupConfig,
                    canvasElements,
                    imageTransform: {
                        rotation: videoTransform.rotation,
                        translateX: videoTransform.translateX,
                        translateY: videoTransform.translateY,
                    },
                    imagePreview3D: imageTransform,
                    apply3DToBackground,
                    imageMaskConfig,
                }
            );

            if (project) {
                setImageUrl(project.imageDataUrl);
                setImageDimensions({ width: img.width, height: img.height });
            }
        } catch (error) {
            console.error("Failed to upload image to history:", error);
        }
    }, [
        createProject,
        backgroundTab,
        selectedWallpaper,
        backgroundBlur,
        selectedImageUrl,
        backgroundColorConfig,
        padding,
        roundedCorners,
        shadows,
        aspectRatio,
        customDimensions,
        cropArea,
        mockupId,
        mockupConfig,
        canvasElements,
        videoTransform,
        imageTransform,
        apply3DToBackground,
        imageMaskConfig,
    ]);

    // Screen capture handler - now creates a project
    const handleScreenCapture = useCallback(async () => {
        const blob = await captureScreen();
        if (blob) {
            try {
                const file = new File([blob], `Screenshot ${new Date().toLocaleString()}.png`, { type: "image/png" });
                const img = await createImageBitmap(blob);

                const project = await createProject(
                    file,
                    file.name,
                    img.width,
                    img.height
                );

                if (project) {
                    setImageUrl(project.imageDataUrl);
                    setImageDimensions({ width: img.width, height: img.height });
                }
            } catch (error) {
                console.error("Failed to create project from screenshot:", error);
            }
        }
    }, [captureScreen, createProject]);

    // Unified image upload handler - always creates a new history entry to preserve existing projects
    const handleImageUploadToCanvas = useCallback(async (file: File) => {
        try {
            const img = await createImageBitmap(file);
            const project = await createProject(
                file,
                file.name,
                img.width,
                img.height,
                {
                    backgroundTab,
                    selectedWallpaper,
                    backgroundBlur,
                    selectedImageUrl,
                    backgroundColorConfig,
                    padding,
                    roundedCorners,
                    shadows,
                    aspectRatio,
                    customDimensions,
                    cropArea,
                    mockupId,
                    mockupConfig,
                    canvasElements,
                    imageTransform: {
                        rotation: videoTransform.rotation,
                        translateX: videoTransform.translateX,
                        translateY: videoTransform.translateY,
                    },
                    imagePreview3D: imageTransform,
                    apply3DToBackground,
                    imageMaskConfig,
                }
            );

            if (project) {
                setImageUrl(project.imageDataUrl);
                setImageDimensions({ width: img.width, height: img.height });
            }
        } catch (error) {
            console.error("Failed to upload image:", error);
        }
    }, [
        createProject,
        backgroundTab,
        selectedWallpaper,
        backgroundBlur,
        selectedImageUrl,
        backgroundColorConfig,
        padding,
        roundedCorners,
        shadows,
        aspectRatio,
        customDimensions,
        cropArea,
        mockupId,
        mockupConfig,
        canvasElements,
        videoTransform,
        imageTransform,
        apply3DToBackground,
        imageMaskConfig,
    ]);

    // Handler for drag & drop images on canvas (photo mode only)
    const handleImageDrop = useCallback(async (files: FileList | File[]) => {
        if (!isPhotoMode) return;

        const fileArray = Array.from(files);
        const imageFile = fileArray.find(f => f.type.startsWith('image/'));

        if (imageFile) {
            await handleImageUploadToCanvas(imageFile);
        }
    }, [isPhotoMode, handleImageUploadToCanvas]);
    const selectCanvasElement = useCallback((id: string | null) => {
        setSelectedElementId(id);
        if (id) {
            setActiveTool("elements");
        }
    }, []);
    // Image export handler - using html-to-image with fixed dimensions
    const handleImageExport = useCallback(async (
        format: ImageExportFormat,
        quality: number,
        scale: number
    ) => {
        if (!canvasRef.current) return;

        try {
            setImageExportProgress({ status: "preparing", progress: 0, message: "Preparing export..." });

            const previewContainer = canvasRef.current.getPreviewContainer();
            if (!previewContainer || !imageUrl) {
                throw new Error("Preview container or image not available");
            }

            const imageElements = previewContainer.querySelectorAll('img');
            const originalSrcs = new Map<HTMLImageElement, string>();

            await Promise.all(Array.from(imageElements).map(async (img) => {
                const src = img.src;
                if (!src.startsWith('blob:') && !src.startsWith('data:')) return;

                try {
                    const response = await fetch(src);
                    const blob = await response.blob();
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    originalSrcs.set(img, src);
                    img.src = base64;
                    if (!img.complete) {
                        await new Promise<void>((resolve) => { img.onload = () => resolve(); });
                    }
                } catch (e) {
                    console.warn("Could not convert image src to base64:", src, e);
                }
            }));

            setImageExportProgress({ status: "rendering", progress: 50, message: "Rendering image..." });

            let exportWidth = 1920;
            let exportHeight = 1080;

            if ((aspectRatio === "auto" || aspectRatio === "custom") && customDimensions) {
                exportWidth = customDimensions.width;
                exportHeight = customDimensions.height;
            } else if (aspectRatio === "auto") {
                if (imageDimensions) {
                    exportWidth = imageDimensions.width;
                    exportHeight = imageDimensions.height;
                }
            } else {
                const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];
                if (dims) { exportWidth = dims.width; exportHeight = dims.height; }
            }

            exportWidth = Math.round(exportWidth * scale);
            exportHeight = Math.round(exportHeight * scale);

            const hasTransparentBackground = selectedWallpaper === -1;

            // Temporarily clear ALL selection indicators (single, multi, and mockup border)
            // so they don't appear in the html-to-image capture
            const prevSingleSelection = selectedElementId;
            selectCanvasElement(null);
            const prevSelectionState = canvasRef.current?.clearAllSelection?.();

            await new Promise(resolve => setTimeout(resolve, 80));

            const blob = await toBlob(previewContainer, {
                quality,
                cacheBust: false,
                ...(hasTransparentBackground ? {} : { backgroundColor: '#09090B' }),
                type: `image/${format}`,
                canvasWidth: exportWidth,
                canvasHeight: exportHeight,
                pixelRatio: 1,
            });

            // Restore all selection state after capture
            if (prevSingleSelection) selectCanvasElement(prevSingleSelection);
            if (prevSelectionState) canvasRef.current?.restoreSelectionState?.(prevSelectionState);

            originalSrcs.forEach((originalSrc, img) => {
                img.src = originalSrc;
            });

            if (!blob) throw new Error("Failed to generate image blob");

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `openvidshot-${Date.now()}.${format}`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);

            setImageExportProgress({ status: "complete", progress: 100, message: "Export complete!" });
            setTimeout(() => setImageExportProgress({ status: "idle", progress: 0, message: "" }), 2000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            setImageExportProgress({ status: "error", progress: 0, message: `Export failed: ${errorMessage}` });
            setTimeout(() => setImageExportProgress({ status: "idle", progress: 0, message: "" }), 4000);
        }
    }, [imageUrl, imageDimensions, selectedWallpaper, aspectRatio, customDimensions, selectedElementId, selectCanvasElement]);
    // Generate canvas snapshot for photo mode previews
    useEffect(() => {
        if (!isPhotoMode || !imageUrl || !canvasRef.current) {
            setCanvasImageUrl(null);
            return;
        }

        const generateSnapshot = async () => {
            try {
                await canvasRef.current?.drawFrame();
                const exportCanvas = canvasRef.current?.getExportCanvas();
                if (exportCanvas) {
                    const dataUrl = exportCanvas.toDataURL("image/png", 0.8);
                    setCanvasImageUrl(dataUrl);
                }
            } catch (error) {
                console.error("Error generating canvas snapshot:", error);
            }
        };

        const initialTimeout = setTimeout(generateSnapshot, 300);

        return () => {
            clearTimeout(initialTimeout);
        };
    }, [isPhotoMode, imageUrl, backgroundTab, selectedWallpaper, backgroundBlur, padding, roundedCorners, shadows, selectedImageUrl, backgroundColorConfig]);

    // Handle 3D preview selection
    const handleSelectPreview = useCallback((config: Preview3DConfig) => {
        setSelectedPreviewId(config.id);
        setImageTransform(config);
    }, []);

    // Handle 3D background toggle
    const handleToggle3DBackground = useCallback((value: boolean) => {
        setApply3DToBackground(value);
    }, [setApply3DToBackground]);

    // Reset all photo editor visual settings to defaults
    const handleResetPhotoEditor = useCallback(() => {
        const frontConfig = PREVIEW_CONFIGS[0];
        setSelectedPreviewId(frontConfig.id);
        setImageTransform(frontConfig);
        setApply3DToBackground(false);
        setImageMaskConfig(DEFAULT_MASK_CONFIG);
        setVideoTransform({ rotation: 0, translateX: 0, translateY: 0 });
    }, []);

    // Videos library state
    const [newVideosCount, setNewVideosCount] = useState<number>(0);
    const [videosLibraryRefresh, setVideosLibraryRefresh] = useState<number>(0);

    // Video track clips state (multi-video support)
    const [videoClips, setVideoClips] = useState<VideoTrackClip[]>([]);
    // Computed from videoClips - array of library video IDs currently in track
    const videosInTrackIds = useMemo(() =>
        videoClips.map(clip => clip.libraryVideoId),
        [videoClips]);
    // Ref para acceder al valor actual de videoClips en callbacks (evitar closure stale)
    const videoClipsRef = useRef<VideoTrackClip[]>([]);
    useEffect(() => {
        videoClipsRef.current = videoClips;
    }, [videoClips]);
    const [selectedVideoClipId, setSelectedVideoClipId] = useState<string | null>(null);

    // Multi-video playback: store video blobs and URLs indexed by libraryVideoId
    const videoBlobsRef = useRef<Map<string, Blob>>(new Map());
    const videoUrlsRef = useRef<Map<string, string>>(new Map());
    const activeClipIdRef = useRef<string | null>(null);
    const activeClipDataRef = useRef<VideoTrackClip | null>(null);
    const clipAudioStateRef = useRef<Map<string, boolean>>(new Map());
    const muteOriginalAudioRef = useRef<boolean>(false);
    useEffect(() => {
        muteOriginalAudioRef.current = muteOriginalAudio;
    }, [muteOriginalAudio]);
    // Audio trim modal state
    const [autoTrimModalOpen, setAutoTrimModalOpen] = useState(false);
    const [pendingAudioUpload, setPendingAudioUpload] = useState<{
        audio: import("@/types/audio.types").UploadedAudio;
        trackId: string;
    } | null>(null);

    // Audio playback refs - store HTML Audio elements for each track
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    // Initialize audio elements when tracks change
    useEffect(() => {
        const currentElements = audioElementsRef.current;
        const currentTrackIds = new Set(audioTracks.map(t => t.id));

        // Remove audio elements for deleted tracks
        for (const [trackId, audioEl] of currentElements.entries()) {
            if (!currentTrackIds.has(trackId)) {
                audioEl.pause();
                audioEl.src = '';
                currentElements.delete(trackId);
            }
        }

        // Create audio elements for new tracks
        for (const track of audioTracks) {
            if (!currentElements.has(track.id)) {
                const audio = uploadedAudios.find(a => a.id === track.audioId);
                if (audio) {
                    const audioEl = new Audio(audio.url);
                    audioEl.preload = 'auto';
                    audioEl.volume = track.volume * masterVolume;
                    currentElements.set(track.id, audioEl);
                }
            }
        }
    }, [audioTracks, uploadedAudios, masterVolume]);

    // Update audio volumes when master volume or track volumes change
    useEffect(() => {
        const currentElements = audioElementsRef.current;
        for (const track of audioTracks) {
            const audioEl = currentElements.get(track.id);
            if (audioEl) {
                audioEl.volume = track.volume * masterVolume;
            }
        }
    }, [audioTracks, masterVolume]);

    // Sync audio playback with video current time
    const syncAudioPlayback = useCallback((videoTime: number, playing: boolean) => {
        if (isExportingRef.current) return;
        const currentElements = audioElementsRef.current;

        for (const track of audioTracks) {
            const audioEl = currentElements.get(track.id);
            if (!audioEl) continue;

            const trackStart = track.startTime;
            const trackEnd = track.startTime + track.duration;
            const trimStart = track.trimStart ?? 0;

            if (videoTime >= trackStart && videoTime < trackEnd) {
                const audioTime = trimStart + (videoTime - trackStart);

                if (Math.abs(audioEl.currentTime - audioTime) > 0.1) {
                    audioEl.currentTime = audioTime;
                }

                if (playing && audioEl.paused) {
                    audioEl.play().catch(() => { });
                } else if (!playing && !audioEl.paused) {
                    audioEl.pause();
                }
            } else {
                if (!audioEl.paused) {
                    audioEl.pause();
                }
            }
        }
    }, [audioTracks]);

    useEffect(() => {
        const elementsRef = audioElementsRef.current;
        return () => {
            for (const audioEl of elementsRef.values()) {
                audioEl.pause();
                audioEl.src = '';
            }
            elementsRef.clear();
        };
    }, []);

    const updateEditorStateDebounced = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (updateEditorStateDebounced.current) {
            clearTimeout(updateEditorStateDebounced.current);
        }
        updateEditorStateDebounced.current = setTimeout(() => {
            setEditorState({
                backgroundTab,
                selectedWallpaper,
                backgroundBlur,
                padding,
                roundedCorners,
                shadows,
                selectedImageUrl,
                backgroundColorConfig,
                aspectRatio,
                customDimensions,
                cropArea,
                trimRange,
                zoomFragments,
                spotlightFragments,
                maskFragments,
                captions: {
                    segments: captionSegments,
                    settings: captionSettings,
                },
                mockupId,
                mockupConfig,
                canvasElements,
                audioTracks,
                muteOriginalAudio,
                masterVolume,
                cameraConfig,
                videoTransform,
                cursorConfig,
                imageTransform,
                apply3DToBackground,
                imageMaskConfig,
                videoMaskConfig,
            });
        }, 300);
        return () => {
            if (updateEditorStateDebounced.current) {
                clearTimeout(updateEditorStateDebounced.current);
            }
        };
    }, [
        backgroundTab, selectedWallpaper, backgroundBlur, padding,
        roundedCorners, shadows, selectedImageUrl, backgroundColorConfig,
        aspectRatio, customDimensions, cropArea, trimRange,
        zoomFragments, spotlightFragments, maskFragments, captionSegments, captionSettings, mockupId, mockupConfig, canvasElements,
        audioTracks, muteOriginalAudio, masterVolume, cameraConfig,
        videoTransform, cursorConfig, imageTransform, apply3DToBackground, imageMaskConfig, videoMaskConfig,
        setEditorState
    ]);

    // Sync editorState → individual states (from undo/redo)
    useEffect(() => {
        setBackgroundTab(editorState.backgroundTab);
        setSelectedWallpaper(editorState.selectedWallpaper);
        setBackgroundBlur(editorState.backgroundBlur);
        setPadding(editorState.padding);
        setRoundedCorners(editorState.roundedCorners);
        setShadows(editorState.shadows);
        setSelectedImageUrl(editorState.selectedImageUrl);
        setBackgroundColorConfig(editorState.backgroundColorConfig);
        setAspectRatio(editorState.aspectRatio);
        setCustomDimensions(editorState.customDimensions);
        setCropArea(editorState.cropArea);
        setTrimRange(editorState.trimRange);
        setZoomFragments(editorState.zoomFragments);
        setSpotlightFragments(editorState.spotlightFragments ?? []);
        setMaskFragments(editorState.maskFragments ?? []);
        setCaptionSegments(editorState.captions?.segments ?? []);
        setCaptionSettings(editorState.captions?.settings ?? DEFAULT_CAPTION_SETTINGS);
        setMockupId(editorState.mockupId);
        setMockupConfig(editorState.mockupConfig);
        setCanvasElements(editorState.canvasElements);
        setAudioTracks(editorState.audioTracks);
        setMuteOriginalAudio(editorState.muteOriginalAudio);
        setMasterVolume(editorState.masterVolume);
        setCameraConfig(editorState.cameraConfig);
        setVideoTransform(editorState.videoTransform);
        setCursorConfig(editorState.cursorConfig);
        setImageTransform(editorState.imageTransform);
        setApply3DToBackground(editorState.apply3DToBackground);
        setImageMaskConfig(editorState.imageMaskConfig);
        setVideoMaskConfig(editorState.videoMaskConfig);
    }, [editorState]);

    // Handler para cambiar el mockup
    const handleMockupChange = useCallback((newMockupId: string) => {
        setMockupId(newMockupId);
        const newMockup = MOCKUPS.find(m => m.id === newMockupId);
        setMockupConfig(getMockupDefaultConfig(newMockup));
    }, []);

    // Handler para cambiar la configuración del mockup
    const handleMockupConfigChange = useCallback((updates: Partial<MockupConfig>) => {
        setMockupConfig(prev => ({ ...prev, ...updates }));
    }, []);

    // Handler para cambiar las esquinas redondeadas (sincroniza ambos valores)
    const handleRoundedCornersChange = useCallback((value: number) => {
        setRoundedCorners(value); // Para NoneMockup y canvas general
        setMockupConfig(prev => ({ ...prev, cornerRadius: value }));
    }, []);

    // Text tool (Figma-style T key) — activates crosshair + canvas click to place text
    const [textToolActive, setTextToolActive] = useState(false);

    // Canvas elements handlers
    const addCanvasElement = useCallback((element: CanvasElement) => {
        setCanvasElements(prev => [...prev, element]);
        setSelectedElementId(element.id);
    }, []);

    const updateCanvasElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
        setCanvasElements(prev => prev.map(el =>
            el.id === id ? { ...el, ...updates } as CanvasElement : el
        ));
    }, []);

    const deleteCanvasElement = useCallback((idOrIds: string | string[]) => {
        const idsToDelete = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        const idsSet = new Set(idsToDelete);
        setCanvasElements(prev => prev.filter(el => !idsSet.has(el.id)));
        setSelectedElementId(prev => prev && idsSet.has(prev) ? null : prev);
    }, []);

    const [copiedElement, setCopiedElement] = useState<CanvasElement | null>(null);

    const copySelectedElement = useCallback(() => {
        if (!selectedElementId) return;
        const element = canvasElements.find(el => el.id === selectedElementId);
        if (element) {
            setCopiedElement(element);
        }
    }, [selectedElementId, canvasElements]);

    const pasteElement = useCallback(() => {
        if (!copiedElement) return;

        const newElement = {
            ...copiedElement,
            id: `${copiedElement.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            x: copiedElement.x + 5,
            y: copiedElement.y + 5,
            zIndex: VIDEO_Z_INDEX + 1,
        } as CanvasElement;

        setCanvasElements(prev => [...prev, newElement]);
        setSelectedElementId(newElement.id);
        setActiveTool("elements");
    }, [copiedElement]);

    const bringToFront = useCallback((id: string) => {
        // Get elements that are above the video (zIndex >= VIDEO_Z_INDEX)
        const aboveVideoElements = canvasElements.filter(el => el.zIndex >= VIDEO_Z_INDEX);
        const maxAboveVideo = aboveVideoElements.length > 0
            ? Math.max(...aboveVideoElements.map(el => el.zIndex))
            : VIDEO_Z_INDEX - 1;
        // Ensure the element goes above video and all other above-video elements
        updateCanvasElement(id, { zIndex: Math.max(maxAboveVideo + 1, VIDEO_Z_INDEX) });
    }, [canvasElements, updateCanvasElement]);

    const sendToBack = useCallback((id: string) => {
        const element = canvasElements.find(el => el.id === id);
        if (!element) return;

        // If element is above video (zIndex >= VIDEO_Z_INDEX), send it just behind video
        if (element.zIndex >= VIDEO_Z_INDEX) {
            const behindVideoElements = canvasElements.filter(el => el.zIndex < VIDEO_Z_INDEX);
            const minBehindVideo = behindVideoElements.length > 0
                ? Math.min(...behindVideoElements.map(el => el.zIndex))
                : VIDEO_Z_INDEX - 100;
            updateCanvasElement(id, { zIndex: Math.min(minBehindVideo - 1, VIDEO_Z_INDEX - 1) });
        } else {
            const behindVideoElements = canvasElements.filter(el => el.zIndex < VIDEO_Z_INDEX && el.id !== id);
            const minBehindVideo = behindVideoElements.length > 0
                ? Math.min(...behindVideoElements.map(el => el.zIndex))
                : element.zIndex;
            updateCanvasElement(id, { zIndex: minBehindVideo - 1 });
        }
    }, [canvasElements, updateCanvasElement]);

    // Audio handlers
    const handleAudioUpload = useCallback(async (file: File) => {
    try {
        if (audioTracks.length >= MAX_AUDIO_TRACKS) {
            alert(`Máximo ${MAX_AUDIO_TRACKS} pistas de audio permitidas.`);
            return;
        }

        const url = URL.createObjectURL(file);

        const audio = new Audio(url);
        await new Promise<void>((resolve, reject) => {
            audio.addEventListener("loadedmetadata", () => resolve());
            audio.addEventListener("error", () =>
                reject(new Error("Failed to load audio"))
            );
        });

        const newAudio: UploadedAudio = {
            id: `audio-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 9)}`,
            name: file.name,
            url,
            duration: audio.duration,
            fileSize: file.size,
            mimeType: file.type,
        };

        setUploadedAudios((prev) => [...prev, newAudio]);
        void saveStoredAudioBlob(videoId, newAudio.id, file);

        const lastTrackEnd = audioTracks.reduce(
            (max, track) => Math.max(max, track.startTime + track.duration),
            0
        );

        const trackId = `track-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;

        const newTrack: AudioTrack = {
            id: trackId,
            audioId: newAudio.id,
            name: newAudio.name,
            startTime: lastTrackEnd,
            duration: newAudio.duration,
            trimStart: 0,
            volume: 1,
            loop: false,
            fadeIn: 0,
            fadeOut: 0,
        };

        setAudioTracks((prev) => [...prev, newTrack]);

        if (audioTracks.length === 0) {
            setMuteOriginalAudio(true);
        }
    } catch (error) {
        console.error("Error uploading audio:", error);
        alert("Error al subir el audio. Por favor intenta de nuevo.");
    }
}, [audioTracks, videoId]);

    const handleAudioDelete = useCallback((audioId: string) => {
        setUploadedAudios(prev => {
            const audio = prev.find(a => a.id === audioId);
            if (audio) {
                URL.revokeObjectURL(audio.url);
            }
            return prev.filter(a => a.id !== audioId);
        });

        setAudioTracks(prev => prev.filter(track => track.audioId !== audioId));
    }, []);

    const handleAddAudioTrack = useCallback((audioId: string) => {
    const audio = uploadedAudios.find((a) => a.id === audioId);
    if (!audio) return;

    if (audioTracks.length >= MAX_AUDIO_TRACKS) {
        alert(`Máximo ${MAX_AUDIO_TRACKS} pistas de audio permitidas.`);
        return;
    }

    if (audioTracks.some((track) => track.audioId === audioId)) {
        return;
    }

    const lastTrackEnd = audioTracks.reduce(
        (max, track) => Math.max(max, track.startTime + track.duration),
        0
    );

    const newTrack: AudioTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        audioId,
        name: audio.name,
        startTime: lastTrackEnd,
        duration: audio.duration,
        trimStart: 0,
        volume: 1,
        loop: false,
        fadeIn: 0,
        fadeOut: 0,
    };

    setAudioTracks((prev) => [...prev, newTrack]);

    if (audioTracks.length === 0) {
        setMuteOriginalAudio(true);
    }
}, [uploadedAudios, audioTracks]);

    const handleUpdateAudioTrack = useCallback(
        (trackId: string, updates: Partial<AudioTrack>) => {
            setAudioTracks((prev) =>
                prev.map((track) =>
                    track.id === trackId ? { ...track, ...updates } : track
                )
            );
        },
        []
    );

    const handleExtendProjectToAudioDuration = useCallback((trackId: string) => {
        const track = audioTracks.find((item) => item.id === trackId);

        if (!track) return;

        const requiredDuration = track.startTime + track.duration;
        const nextDuration = Math.max(videoDuration, requiredDuration);

        setVideoDuration(nextDuration);
        setTrimRange((prev) => ({
            start: prev.start,
            end: Math.max(prev.end, nextDuration),
        }));
    }, [audioTracks, videoDuration]);

    const handleDeleteAudioTrack = useCallback((trackId: string) => {
        setAudioTracks(prev => {
            const remaining = prev.filter(track => track.id !== trackId);
            if (remaining.length === 0) {
                setMuteOriginalAudio(false);
            }
            return remaining;
        });
    }, []);

    const handleToggleMuteOriginalAudio = useCallback(() => {
        setMuteOriginalAudio(prev => !prev);
    }, []);

    const handleMasterVolumeChange = useCallback((volume: number) => {
        setMasterVolume(volume);
    }, []);

    const handleSelectAudioTrack = useCallback((trackId: string | null) => {
        setSelectedAudioTrackId(trackId);
        if (trackId) {
            setSelectedZoomFragmentId(null);
            setSelectedVideoClipId(null);
            setSelectedElementId(null);
            setActiveTool("audio");
        }
    }, []);

    const [thumbnailClipId, setThumbnailClipId] = useState<string | null>(null);

    const thumbnailsCacheRef = useRef<Map<string, VideoThumbnail[]>>(new Map());

    const currentDisplayTime = isDraggingPlayhead ? scrubTime : currentTime;
    useEffect(() => {
        if (videoClips.length <= 1) {
            setThumbnailClipId(null);
            return;
        }
        const clipAtTime = getClipAtTime(videoClips, currentDisplayTime);
        if (clipAtTime) {
            setThumbnailClipId(prev => {
                if (prev !== clipAtTime.libraryVideoId) {
                    return clipAtTime.libraryVideoId;
                }
                return prev;
            });
        }
    }, [currentDisplayTime, videoClips]);

    const thumbnailUrl = useMemo(() => {
        if (videoClips.length <= 1 || !thumbnailClipId) return videoUrl;
        return videoUrlsRef.current.get(thumbnailClipId) || videoUrl;
    }, [videoUrl, videoClips.length, thumbnailClipId]);

    const thumbnailVideoId = useMemo(() => {
        if (videoClips.length <= 1 || !thumbnailClipId) return videoId;
        return thumbnailClipId;
    }, [videoId, videoClips.length, thumbnailClipId]);

    const thumbnailDuration = useMemo(() => {
        if (videoClips.length <= 1 || !thumbnailClipId) return videoDuration;
        const clip = videoClips.find(c => c.libraryVideoId === thumbnailClipId);
        return clip?.duration || videoDuration;
    }, [videoDuration, videoClips, thumbnailClipId]);

    const { getThumbnailForTime: getRawThumbnailForTime, thumbnails: currentThumbnails } = useVideoThumbnails(
        thumbnailUrl,
        thumbnailDuration,
        {
            interval: 0.1,
            quality: "high",
            videoId: thumbnailVideoId || undefined,
        }
    );

    useEffect(() => {
        if (thumbnailVideoId && currentThumbnails.length > 0) {
            thumbnailsCacheRef.current.set(thumbnailVideoId, currentThumbnails);
        }
    }, [thumbnailVideoId, currentThumbnails]);

    const findNearestThumbnail = useCallback((thumbs: VideoThumbnail[], time: number): VideoThumbnail | null => {
        if (thumbs.length === 0) return null;
        let left = 0;
        let right = thumbs.length - 1;
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (thumbs[mid].time < time) left = mid + 1;
            else right = mid;
        }
        if (left > 0) {
            const prevDiff = Math.abs(thumbs[left - 1].time - time);
            const currDiff = Math.abs(thumbs[left].time - time);
            if (prevDiff < currDiff) return thumbs[left - 1];
        }
        return thumbs[left];
    }, []);

    // Clip-aware getThumbnailForTime: looks up any clip's thumbnails from cache
    const getThumbnailForTime = useCallback((timelineTime: number) => {
        const clips = videoClipsRef.current;
        if (clips.length <= 1) {
            return getRawThumbnailForTime(timelineTime);
        }

        const clipAtTime = getClipAtTime(clips, timelineTime);
        if (!clipAtTime) return null;

        const localTime = clipAtTime.trimStart + (timelineTime - clipAtTime.startTime);

        // If this is the currently generating clip, use the hook directly (most up-to-date)
        if (clipAtTime.libraryVideoId === thumbnailVideoId) {
            return getRawThumbnailForTime(localTime);
        }

        // Otherwise, check the persistent cache
        const cached = thumbnailsCacheRef.current.get(clipAtTime.libraryVideoId);
        if (cached && cached.length > 0) {
            return findNearestThumbnail(cached, localTime);
        }

        return null;
    }, [getRawThumbnailForTime, thumbnailVideoId, findNearestThumbnail]);

    // Find which clip is active at a given timeline time - using standardized function
    const findActiveClipAtTime = useCallback((timelineTime: number): VideoTrackClip | null => {
        const clips = videoClipsRef.current;
        return getClipAtTime(clips, timelineTime);
    }, []);

    // Convert timeline time to clip-local time
    const timelineToClipTime = useCallback((timelineTime: number, clip: VideoTrackClip): number => {
        const offsetInClip = timelineTime - clip.startTime;
        return clip.trimStart + offsetInClip;
    }, []);

    // Pre-load video blobs when clips change
    useEffect(() => {
        const loadClipBlobs = async () => {
            const currentBlobs = videoBlobsRef.current;
            const currentUrls = videoUrlsRef.current;
            const neededIds = new Set(videoClips.map(c => c.libraryVideoId));

            for (const [id, url] of currentUrls.entries()) {
                if (!neededIds.has(id)) {
                    URL.revokeObjectURL(url);
                    currentUrls.delete(id);
                    currentBlobs.delete(id);
                }
            }

            for (const clip of videoClips) {
                if (!currentBlobs.has(clip.libraryVideoId)) {
                    try {
                        const libraryVideo = await getLibraryVideo(clip.libraryVideoId);
                        if (libraryVideo) {
                            currentBlobs.set(clip.libraryVideoId, libraryVideo.blob);
                            const url = URL.createObjectURL(libraryVideo.blob);
                            currentUrls.set(clip.libraryVideoId, url);
                        }
                    } catch (e) {
                        console.warn("Failed to load video blob for clip:", clip.id, e);
                    }
                }
            }
        };

        if (videoClips.length > 0) {
            loadClipBlobs();
        }
    }, [videoClips]);

    const { exportVideo, cancelExport, exportProgress } = useVideoExport(videoRef, canvasRef);
    const { uploadVideo, loadUploadedVideo, isUploading } = useVideoUpload();
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

    const handleExport = (quality: ExportQuality) => {
        isExportingRef.current = true;
        for (const audioEl of audioElementsRef.current.values()) {
            audioEl.pause();
        }

        exportVideo({
            quality,
            videoBlob: videoBlob ?? undefined,
            transparentBackground: selectedWallpaper === -1,
            trim: trimRange.end > trimRange.start ? { start: trimRange.start, end: trimRange.end } : undefined,
            muteOriginalAudio,
            videoHasAudioTrack: videoHasAudioTrack,
            audioTracks: audioTracks.map((track) => {
                const audio = uploadedAudios.find((a) => a.id === track.audioId);
                return {
                    audioUrl: audio?.url || "",
                    startTime: track.startTime,
                    duration: track.duration,
                    trimStart: track.trimStart ?? 0,
                    volume: track.volume,
                    loop: track.loop,
                    fadeIn: track.fadeIn ?? 0,
                    fadeOut: track.fadeOut ?? 0,
                };
            }),
            masterVolume,
            videoClips: videoClips.length > 0 ? videoClips : undefined,
            videoClipBlobs: videoClips.length > 1 ? videoBlobsRef.current : undefined,
            clipAudioStates: Object.fromEntries(clipAudioStateRef.current),
        }).finally(() => {
        });
    };

    // Handler para subir video (desde ToolsSidebar)
    const handleVideoUpload = useCallback(async (file: File) => {
        const hasExistingClips = videoClipsRef.current.length > 0;

        // Add video to library first
        let libraryVideo: Awaited<ReturnType<typeof addVideoToLibrary>> | null = null;
        try {
            libraryVideo = await addVideoToLibrary(file);
            const count = await getLibraryVideoCount();
            setNewVideosCount(hasExistingClips ? count : 0);
            setVideosLibraryRefresh(prev => prev + 1);
        } catch (error) {
            console.warn("Failed to add video to library:", error);
            return;
        }

        if (hasExistingClips) {
            setActiveTool("videos");
            return;
        }

        // First video - add to track
        for (const [, url] of videoUrlsRef.current.entries()) {
            URL.revokeObjectURL(url);
        }
        videoBlobsRef.current.clear();
        videoUrlsRef.current.clear();
        activeClipIdRef.current = null;
        activeClipDataRef.current = null;
        setVideoBlob(file);
        if (libraryVideo) {
            const originalHasAudio = libraryVideo.originalHasAudio !== false;
            setVideoHasAudioTrack(originalHasAudio);
            if (!originalHasAudio) setMuteOriginalAudio(true);
            clipAudioStateRef.current.set(libraryVideo.id, libraryVideo.hasAudio !== false);
        }

        try {
            await clearAllThumbnailCache();
        } catch (error) {
            console.warn("Failed to clear thumbnails:", error);
        }

        const uploadedData = await uploadVideo(file);
        if (uploadedData && libraryVideo) {
            lastLoadedVideoIdRef.current = uploadedData.videoId;

            setVideoUrl(uploadedData.url);
            setVideoId(uploadedData.videoId);
            setVideoDuration(uploadedData.duration);
            setTrimRange({ start: 0, end: uploadedData.duration });
            setAspectRatio(uploadedData.aspectRatio);
            setVideoDimensions({ width: uploadedData.width, height: uploadedData.height });

            const newClip: VideoTrackClip = {
                id: crypto.randomUUID(),
                libraryVideoId: libraryVideo.id,
                name: file.name,
                startTime: 0,
                duration: uploadedData.duration,
                trimStart: 0,
                trimEnd: uploadedData.duration,
                thumbnailUrl: libraryVideo.thumbnailUrl,
            };
            clipAudioStateRef.current.set(libraryVideo.id, libraryVideo.hasAudio !== false);
            activeClipIdRef.current = newClip.id;
            activeClipDataRef.current = newClip;
            setVideoClips([newClip]);
            setSelectedVideoClipId(newClip.id);

            setZoomFragments(getStoredOrDefaultZoomFragments(uploadedData.videoId, uploadedData.duration));
            setSpotlightFragments(loadStoredSpotlightFragments(uploadedData.videoId));
            setSelectedSpotlightFragmentId(null);
            setMaskFragments(loadStoredMaskFragments(uploadedData.videoId));
            const storedCaptionState = loadStoredCaptionEditorState(uploadedData.videoId);
            setCaptionSegments(storedCaptionState?.segments ?? []);
            setCaptionSettings(storedCaptionState?.settings ?? DEFAULT_CAPTION_SETTINGS);
            setSelectedMaskFragmentId(null);

            const storedAudioState = loadStoredAudioEditorState(uploadedData.videoId);
            if (storedAudioState) {
                setAudioTracks(storedAudioState.audioTracks);
                setMuteOriginalAudio(storedAudioState.muteOriginalAudio);
                setMasterVolume(storedAudioState.masterVolume);
                void restoreStoredUploadedAudios(uploadedData.videoId, storedAudioState.uploadedAudios).then(setUploadedAudios);
            } else {
                setAudioTracks([]);
                setUploadedAudios([]);
                setMasterVolume(1);
            }

            setCurrentTime(0);
            setIsPlaying(false);
            setTimeout(() => clearHistory(), 200);
        }
    }, [uploadVideo, clearHistory]);

    // Handler para subir video solo a la librería (desde VideosMenu)
    const handleVideoUploadToLibrary = useCallback(async (file: File) => {
        try {
            await addVideoToLibrary(file);
            const count = await getLibraryVideoCount();
            setNewVideosCount(count);
            setVideosLibraryRefresh(prev => prev + 1);
        } catch (error) {
            console.warn("Failed to add video to library:", error);
        }
    }, []);

    // Handler para agregar video desde la librería al track (concatenar)
    const handleAddVideoToTrack = useCallback(async (videoId: string, blob: Blob, duration: number) => {
        // Get video info from library
        const libraryVideo = await import("@/lib/videos-library").then(m => m.getLibraryVideo(videoId));
        if (!libraryVideo) return;

        // Cache the per-clip audio state (hasAudio defaults to true if undefined)
        clipAudioStateRef.current.set(videoId, libraryVideo.hasAudio !== false);

        // Store blob in ref for multi-video playback
        if (!videoBlobsRef.current.has(videoId)) {
            videoBlobsRef.current.set(videoId, blob);
            const blobUrl = URL.createObjectURL(blob);
            videoUrlsRef.current.set(videoId, blobUrl);
        }

        // Usar functional update para tener siempre el estado más reciente
        setVideoClips(prevClips => {
            const startTime = findNextClipPosition(prevClips);

            const newClip: VideoTrackClip = {
                id: crypto.randomUUID(),
                libraryVideoId: videoId,
                name: libraryVideo.fileName,
                startTime,
                duration,
                trimStart: 0,
                trimEnd: duration,
                thumbnailUrl: libraryVideo.thumbnailUrl,
            };

            const updatedClips = [...prevClips, newClip];

            setTimeout(() => {
                const newTotalDuration = calculateTotalDuration(updatedClips);
                setVideoDuration(newTotalDuration);
                setTrimRange({ start: 0, end: newTotalDuration });

                if (prevClips.length === 0) {
                    activeClipIdRef.current = newClip.id;
                    activeClipDataRef.current = newClip;
                    const url = videoUrlsRef.current.get(videoId) || URL.createObjectURL(blob);
                    setVideoBlob(blob);
                    setVideoUrl(url);
                    setVideoId(videoId);

                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    const metadataUrl = URL.createObjectURL(blob);
                    video.onloadedmetadata = () => {
                        setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
                        setAspectRatio("auto");
                        URL.revokeObjectURL(metadataUrl);
                    };
                    video.src = metadataUrl;

                    setZoomFragments(getStoredOrDefaultZoomFragments(videoId, duration));
                    setSpotlightFragments(loadStoredSpotlightFragments(videoId));
                    setSelectedSpotlightFragmentId(null);
                    setMaskFragments(loadStoredMaskFragments(videoId));
            const storedCaptionState = loadStoredCaptionEditorState(videoId);
            setCaptionSegments(storedCaptionState?.segments ?? []);
            setCaptionSettings(storedCaptionState?.settings ?? DEFAULT_CAPTION_SETTINGS);
                    setSelectedMaskFragmentId(null);

            const storedAudioState = loadStoredAudioEditorState(videoId);
            if (storedAudioState) {
                setAudioTracks(storedAudioState.audioTracks);
                setMuteOriginalAudio(storedAudioState.muteOriginalAudio);
                setMasterVolume(storedAudioState.masterVolume);
                void restoreStoredUploadedAudios(videoId, storedAudioState.uploadedAudios).then(setUploadedAudios);
            } else {
                setAudioTracks([]);
                setUploadedAudios([]);
                setMasterVolume(1);
            }

                    setCurrentTime(0);
                    setIsPlaying(false);
                }

                setNewVideosCount(0);
                clearHistory();
            }, 0);

            return updatedClips;
        });
    }, [clearHistory]);

    // Handlers for video clip management
    const handleSelectVideoClip = useCallback((clipId: string | null) => {
        setSelectedVideoClipId(clipId);
        // Clear other selections when selecting video clip (mutual exclusivity)
        if (clipId) {
            setSelectedZoomFragmentId(null);
            setSelectedAudioTrackId(null);
            setSelectedElementId(null);
            setActiveTool("videos");
        }
    }, []);

    const handleUpdateVideoClip = useCallback((clipId: string, updates: Partial<VideoTrackClip>) => {
        setVideoClips(prev => {
            const newClips = prev.map(clip =>
                clip.id === clipId ? { ...clip, ...updates } : clip
            );
            if (updates.startTime !== undefined || updates.trimEnd !== undefined || updates.trimStart !== undefined) {
                const newDuration = calculateTotalDuration(newClips);
                setVideoDuration(newDuration);
                setTrimRange({ start: 0, end: newDuration });
            }
            return newClips;
        });
    }, []);

    const handleDeleteVideoClip = useCallback((clipId: string) => {
        setVideoClips(prev => {
            const newClips = prev.filter(clip => clip.id !== clipId);
            if (newClips.length > 0) {
                const newDuration = calculateTotalDuration(newClips);
                setVideoDuration(newDuration);
                setTrimRange({ start: 0, end: newDuration });

                if (activeClipIdRef.current === clipId) {
                    const firstClip = [...newClips].sort((a, b) => a.startTime - b.startTime)[0];
                    activeClipIdRef.current = firstClip.id;
                    activeClipDataRef.current = firstClip;
                    const url = videoUrlsRef.current.get(firstClip.libraryVideoId);
                    if (url && videoRef.current) {
                        videoRef.current.src = url;
                        videoRef.current.currentTime = firstClip.trimStart;
                    }
                    setCurrentTime(firstClip.startTime);
                }
            } else {
                setVideoUrl(null);
                setVideoId(null);
                setVideoDuration(0);
                setTrimRange({ start: 0, end: 0 });
                activeClipIdRef.current = null;
                activeClipDataRef.current = null;
                if (videoRef.current) {
                    videoRef.current.removeAttribute('src');
                }
            }
            return newClips;
        });
        if (selectedVideoClipId === clipId) {
            setSelectedVideoClipId(null);
        }
    }, [selectedVideoClipId]);

    // Handler para eliminar video de track cuando se elimina de la librería (cascade delete)
    const handleDeleteVideoFromLibrary = useCallback((libraryVideoId: string) => {
        setVideoClips(prev => {
            const newClips = prev.filter(clip => clip.libraryVideoId !== libraryVideoId);
            if (newClips.length > 0) {
                const newDuration = calculateTotalDuration(newClips);
                setVideoDuration(newDuration);
                setTrimRange({ start: 0, end: newDuration });
            } else {
                setVideoUrl(null);
                setVideoId(null);
                setVideoDuration(0);
                setTrimRange({ start: 0, end: 0 });
                activeClipIdRef.current = null;
                activeClipDataRef.current = null;
                if (videoRef.current) {
                    videoRef.current.removeAttribute('src');
                    videoRef.current.load();
                }
                lastLoadedVideoIdRef.current = null;
                deleteRecordedVideo().catch(() => { });
                deleteUploadedVideo().catch(() => { });
            }
            return newClips;
        });
        // Clean up blob/URL refs
        if (videoBlobsRef.current.has(libraryVideoId)) {
            videoBlobsRef.current.delete(libraryVideoId);
        }
        if (videoUrlsRef.current.has(libraryVideoId)) {
            const url = videoUrlsRef.current.get(libraryVideoId);
            if (url) URL.revokeObjectURL(url);
            videoUrlsRef.current.delete(libraryVideoId);
        }
    }, []);

    // Handler for per-clip audio toggle from VideosMenu
    const handleVideoAudioToggle = useCallback((videoId: string, hasAudio: boolean) => {
        clipAudioStateRef.current.set(videoId, hasAudio);

        const activeClip = activeClipDataRef.current;
        if (activeClip && activeClip.libraryVideoId === videoId && videoRef.current) {
            videoRef.current.muted = muteOriginalAudioRef.current || !hasAudio;
        }
    }, []);

    // Handler para quitar video del track (toggle) - solo remueve el clip, no la librería
    const handleRemoveVideoFromTrack = useCallback((libraryVideoId: string) => {
        setVideoClips(prev => {
            const newClips = prev.filter(clip => clip.libraryVideoId !== libraryVideoId);
            if (newClips.length > 0) {
                const newDuration = calculateTotalDuration(newClips);
                setVideoDuration(newDuration);
                setTrimRange({ start: 0, end: newDuration });
                const currentActiveId = activeClipIdRef.current;
                if (currentActiveId && !newClips.find(c => c.id === currentActiveId)) {
                    activeClipIdRef.current = newClips[0].id;
                }
            } else {
                setVideoUrl(null);
                setVideoId(null);
                setVideoDuration(0);
                setTrimRange({ start: 0, end: 0 });
                activeClipIdRef.current = null;
                activeClipDataRef.current = null;
            }
            return newClips;
        });
    }, []);

    useEffect(() => {
        if (activeTool === "videos") {
            setNewVideosCount(0);
        }
    }, [activeTool]);

    const lastLoadedVideoIdRef = useRef<string | null>(null);

    // Load image from cache when in photo mode and create project if not exists
    useEffect(() => {
        if (!isPhotoMode) return;
        if (currentProject) return;
        if (isLoadingFromCacheRef.current) return;
        isLoadingFromCacheRef.current = true;

        const loadImage = async () => {
            try {
                const cachedImage = await getUploadedImage();
                if (cachedImage) {
                    await deleteUploadedImage();

                    const blob = cachedImage.blob;
                    const img = await createImageBitmap(blob);

                    const project = await createProject(
                        blob,
                        cachedImage.fileName || "Uploaded Image",
                        img.width,
                        img.height
                    );

                    if (project) {
                        setImageUrl(project.imageDataUrl);
                        setImageDimensions({ width: img.width, height: img.height });
                    }
                }
            } catch (error) {
                console.error("Error loading image from cache:", error);
            } finally {
                isLoadingFromCacheRef.current = false;
            }
        };

        loadImage();
    }, [isPhotoMode, currentProject, createProject]);

    useEffect(() => {
        const loadVideo = async () => {
            try {
                const [uploadedData, recordedData, cachedUpload] = await Promise.all([
                    loadUploadedVideo(),
                    loadVideoFromIndexedDB(),
                    getUploadedVideo(),
                ]);

                let videoToLoad: typeof uploadedData | typeof recordedData = null;
                let videoBlob: Blob | null = null;

                if (uploadedData && recordedData) {
                    videoToLoad = uploadedData.timestamp > recordedData.timestamp ? uploadedData : recordedData;
                    if (uploadedData.timestamp > recordedData.timestamp && cachedUpload) {
                        videoBlob = cachedUpload.blob;
                    } else if ('blob' in recordedData && recordedData.blob) {
                        videoBlob = recordedData.blob;
                    }
                } else if (uploadedData) {
                    videoToLoad = uploadedData;
                    if (cachedUpload) {
                        videoBlob = cachedUpload.blob;
                    }
                } else if (recordedData) {
                    videoToLoad = recordedData;
                    if ('blob' in recordedData && recordedData.blob) {
                        videoBlob = recordedData.blob;
                    }
                }

                if (videoToLoad) {
                    if (lastLoadedVideoIdRef.current !== videoToLoad.videoId && videoClipsRef.current.length === 0) {
                        lastLoadedVideoIdRef.current = videoToLoad.videoId;

                        setVideoUrl(videoToLoad.url);
                        setVideoId(videoToLoad.videoId);
                        if (videoRef.current) {
                            videoRef.current.src = videoToLoad.url;
                        }
                        setVideoDuration(videoToLoad.duration);
                        setTrimRange({ start: 0, end: videoToLoad.duration });
                        setZoomFragments(getStoredOrDefaultZoomFragments(videoToLoad.videoId, videoToLoad.duration));
                        setSpotlightFragments(loadStoredSpotlightFragments(videoToLoad.videoId));
                        setSelectedSpotlightFragmentId(null);
                        setMaskFragments(loadStoredMaskFragments(videoToLoad.videoId));
            const storedCaptionState = loadStoredCaptionEditorState(videoToLoad.videoId);
            setCaptionSegments(storedCaptionState?.segments ?? []);
            setCaptionSettings(storedCaptionState?.settings ?? DEFAULT_CAPTION_SETTINGS);
                        setSelectedMaskFragmentId(null);

            const storedAudioState = loadStoredAudioEditorState(videoToLoad.videoId);
            if (storedAudioState) {
                setAudioTracks(storedAudioState.audioTracks);
                setMuteOriginalAudio(storedAudioState.muteOriginalAudio);
                setMasterVolume(storedAudioState.masterVolume);
                void restoreStoredUploadedAudios(videoToLoad.videoId, storedAudioState.uploadedAudios).then(setUploadedAudios);
            } else {
                setAudioTracks([]);
                setUploadedAudios([]);
                setMasterVolume(1);
            }

                        if ('aspectRatio' in videoToLoad) {
                            setAspectRatio(videoToLoad.aspectRatio || "auto");
                            if (videoToLoad.width && videoToLoad.height) {
                                setVideoDimensions({ width: videoToLoad.width, height: videoToLoad.height });
                            }
                        }

                        if (videoBlob && videoBlob.size > 0) {
                            setVideoBlob(videoBlob);

                            const fileName = 'fileName' in videoToLoad
                                ? (videoToLoad.fileName as string)
                                : `Recording-${videoToLoad.videoId}.webm`;
                            const width = 'width' in videoToLoad ? (videoToLoad.width as number) : 1920;
                            const height = 'height' in videoToLoad ? (videoToLoad.height as number) : 1080;

                            try {
                                let libraryVideo = await findExistingVideo(fileName, videoBlob.size);

                                if (!libraryVideo) {
                                    libraryVideo = await addVideoToLibraryWithMetadata({
                                        blob: videoBlob,
                                        fileName,
                                        duration: videoToLoad.duration,
                                        width,
                                        height,
                                    });
                                }

                                videoBlobsRef.current.set(libraryVideo.id, videoBlob);
                                videoUrlsRef.current.set(libraryVideo.id, videoToLoad.url);
                                const originalHasAudio = libraryVideo.originalHasAudio !== false;
                                clipAudioStateRef.current.set(libraryVideo.id, libraryVideo.hasAudio !== false);
                                setVideoHasAudioTrack(originalHasAudio);
                                if (!originalHasAudio) setMuteOriginalAudio(true);

                                const newClip: VideoTrackClip = {
                                    id: crypto.randomUUID(),
                                    libraryVideoId: libraryVideo.id,
                                    name: libraryVideo.fileName,
                                    startTime: 0,
                                    duration: libraryVideo.duration,
                                    trimStart: 0,
                                    trimEnd: libraryVideo.duration,
                                    thumbnailUrl: libraryVideo.thumbnailUrl,
                                    hasCamera: 'cameraUrl' in videoToLoad && !!videoToLoad.cameraUrl,
                                };

                                activeClipIdRef.current = newClip.id;
                                activeClipDataRef.current = newClip;

                                setVideoClips([newClip]);
                                setVideosLibraryRefresh(prev => prev + 1);
                            } catch (e) {
                                console.warn("Failed to add video to library:", e);
                            }
                        }

                        if ('isRecordedVideo' in videoToLoad && videoToLoad.isRecordedVideo) {
                            setIsRecordedVideo(true);
                        } else {
                            setIsRecordedVideo(false);
                        }

                        if ('cursorData' in videoToLoad && videoToLoad.cursorData) {
                            setCursorData(videoToLoad.cursorData);
                        } else {
                            setCursorData(undefined);
                        }

                        if ('cameraUrl' in videoToLoad && videoToLoad.cameraUrl) {
                            setCameraUrl(videoToLoad.cameraUrl);
                        } else {
                            setCameraUrl(null);
                        }
                        if ('cameraConfig' in videoToLoad && videoToLoad.cameraConfig) {
                            setCameraConfig(videoToLoad.cameraConfig);
                        } else {
                            setCameraConfig(null);
                        }

                        setTimeout(() => {
                            clearHistory();
                        }, 200);
                    }
                }

            } catch (error) {
                console.error("Error loading video:", error);
            }
        };

        loadVideo();

        // Re-check when page becomes visible (user navigates back or uploads new video)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                loadVideo();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [loadUploadedVideo, clearHistory]);

    useEffect(() => {
        if (uploadedImages.length > 0) {
            localStorage.setItem("openvid-uploaded-images", JSON.stringify(uploadedImages));
        }
    }, [uploadedImages]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = muteOriginalAudio;
        }
    }, [muteOriginalAudio]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInputFocused = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            if (isInputFocused) return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (canUndo) {
                    undo();
                }
            }

            if (((e.ctrlKey || e.metaKey) && e.key === 'y') ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                if (canRedo) {
                    redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);

    // Keyboard listener for Ctrl+V image paste (photo mode only)
    useEffect(() => {
        if (!isPhotoMode) return;

        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        handleImageUploadToCanvas(file);
                    }
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isPhotoMode, handleImageUploadToCanvas]);

    const togglePlayPause = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                const clips = videoClipsRef.current;
                if (clips.length > 0 && activeClipDataRef.current) {
                    const activeClip = activeClipDataRef.current;
                    const offsetInClip = videoRef.current.currentTime - activeClip.trimStart;
                    const timelineTime = activeClip.startTime + offsetInClip;
                    setCurrentTime(timelineTime);
                    syncAudioPlayback(timelineTime, false);
                } else {
                    syncAudioPlayback(currentTime, false);
                }
            } else {
                const clips = videoClipsRef.current;
                let startTime = currentTime;

                if (trimRange.end > 0) {
                    if (startTime < trimRange.start || startTime >= trimRange.end) {
                        startTime = trimRange.start;
                        setCurrentTime(startTime);
                    }
                }

                if (clips.length > 0) {
                    const clipAtTime = findActiveClipAtTime(startTime);
                    if (clipAtTime) {
                        if (clipAtTime.id !== activeClipIdRef.current) {
                            const url = videoUrlsRef.current.get(clipAtTime.libraryVideoId);
                            if (url && videoRef.current) {
                                activeClipIdRef.current = clipAtTime.id;
                                activeClipDataRef.current = clipAtTime;
                                videoRef.current.src = url;

                                const clipTime = timelineToClipTime(startTime, clipAtTime);
                                const onCanPlay = () => {
                                    if (videoRef.current) {
                                        videoRef.current.playbackRate = 1.0;
                                        videoRef.current.currentTime = clipTime;
                                        const clipHasAudio = clipAudioStateRef.current.get(clipAtTime.libraryVideoId);
                                        videoRef.current.muted = muteOriginalAudioRef.current || clipHasAudio === false;
                                        videoRef.current.play().catch(() => { });
                                        syncAudioPlayback(startTime, true);
                                    }
                                    videoRef.current?.removeEventListener('canplay', onCanPlay);
                                };
                                videoRef.current.addEventListener('canplay', onCanPlay);
                                setIsPlaying(true);
                                return;
                            }
                        } else {
                            activeClipIdRef.current = clipAtTime.id;
                            activeClipDataRef.current = clipAtTime;
                            const clipTime = timelineToClipTime(startTime, clipAtTime);
                            videoRef.current.currentTime = clipTime;
                        }
                    } else if (clips.length === 1) {
                        const clip = clips[0];
                        activeClipIdRef.current = clip.id;
                        activeClipDataRef.current = clip;
                        videoRef.current.currentTime = clip.trimStart;
                        setCurrentTime(clip.startTime);
                    }
                } else {
                    videoRef.current.currentTime = startTime;
                }

                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        if (error.name !== 'AbortError') {
                            console.warn('Play interrupted:', error);
                        }
                    });
                }
                syncAudioPlayback(startTime, true);
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying, currentTime, trimRange.start, trimRange.end, syncAudioPlayback, findActiveClipAtTime, timelineToClipTime]);

    const updateTimeSmoothRef = useRef<() => void>(() => { });

    useEffect(() => {
        updateTimeSmoothRef.current = () => {
            if (justEndedRef.current) return;
            if (isSwitchingClipRef.current) {
                if (isPlaying && !isDraggingPlayhead) {
                    animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
                }
                return;
            }

            if (videoRef.current && !isDraggingPlayhead) {
                const clips = videoClipsRef.current;

                if (clips.length > 0) {
                    const currentVideoTime = videoRef.current.currentTime;

                    let activeClip: VideoTrackClip | null = null;

                    if (activeClipDataRef.current && activeClipDataRef.current.id === activeClipIdRef.current) {
                        activeClip = activeClipDataRef.current;
                    } else {
                        const foundByIdActiveClip = clips.find(c => c.id === activeClipIdRef.current);

                        if (foundByIdActiveClip) {
                            activeClip = foundByIdActiveClip;
                        } else if (clips.length === 1) {
                            activeClip = clips[0];
                        } else {
                            activeClip = clips[0];
                        }
                    }

                    if (!activeClip) {
                        if (isPlaying && !isDraggingPlayhead) {
                            animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
                        }
                        return;
                    }

                    if (!isSwitchingClipRef.current && activeClipIdRef.current !== activeClip.id) {
                        activeClipIdRef.current = activeClip.id;
                        activeClipDataRef.current = activeClip;
                    }

                    if (clipSwitchTimeRef.current !== null) {
                        setCurrentTime(clipSwitchTimeRef.current);
                        if (isPlaying && !isDraggingPlayhead) {
                            animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
                        }
                        return;
                    }

                    if (activeClip) {
                        const offsetInClip = currentVideoTime - activeClip.trimStart;
                        const timelineTime = activeClip.startTime + offsetInClip;
                        const clipDuration = activeClip.trimEnd - activeClip.trimStart;
                        const clipEndOnTimeline = activeClip.startTime + clipDuration;

                        const reachedEndByTime = currentVideoTime >= activeClip.trimEnd;
                        const reachedEndByTimeline = timelineTime >= clipEndOnTimeline;

                        if (reachedEndByTime || reachedEndByTimeline) {
                            const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
                            const currentIndex = sortedClips.findIndex(c => c.id === activeClip!.id);
                            const nextClip = sortedClips[currentIndex + 1];

                            if (nextClip) {
                                const nextUrl = videoUrlsRef.current.get(nextClip.libraryVideoId);
                                const nextBlob = videoBlobsRef.current.get(nextClip.libraryVideoId);

                                if (nextUrl && videoRef.current) {
                                    const nextClipSnapshot = { ...nextClip };

                                    activeClipIdRef.current = nextClipSnapshot.id;
                                    activeClipDataRef.current = nextClipSnapshot;
                                    clipSwitchTimeRef.current = nextClipSnapshot.startTime;
                                    isSwitchingClipRef.current = true;

                                    const currentVideo = videoRef.current;
                                    currentVideo.pause();
                                    currentVideo.src = nextUrl;

                                    const startPlayback = () => {
                                        clipSwitchTimeRef.current = null;
                                        isSwitchingClipRef.current = false;
                                        justEndedRef.current = false;
                                        currentVideo.playbackRate = 1.0;
                                        const nextClipHasAudio = clipAudioStateRef.current.get(nextClipSnapshot.libraryVideoId);
                                        currentVideo.muted = muteOriginalAudioRef.current || nextClipHasAudio === false;
                                        currentVideo.play().catch(e => {
                                            if (e.name !== 'AbortError') console.warn('Play interrupted:', e);
                                        });
                                        setIsPlaying(true);
                                        animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
                                    };

                                    const onCanPlay = () => {
                                        if (currentVideo) {
                                            const targetTime = nextClipSnapshot.trimStart;
                                            if (targetTime < 0.01) {
                                                currentVideo.currentTime = 0;
                                                startPlayback();
                                            } else {
                                                const onSeeked = () => {
                                                    startPlayback();
                                                    currentVideo.removeEventListener('seeked', onSeeked);
                                                };
                                                currentVideo.addEventListener('seeked', onSeeked);
                                                currentVideo.currentTime = targetTime;
                                            }
                                        }
                                        currentVideo?.removeEventListener('canplay', onCanPlay);
                                    };
                                    currentVideo.addEventListener('canplay', onCanPlay);

                                    setCurrentTime(nextClipSnapshot.startTime);
                                    animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
                                    return;
                                }
                            } else {
                                videoRef.current.pause();
                                syncAudioPlayback(clipEndOnTimeline, false);
                                setIsPlaying(false);
                                justEndedRef.current = true;
                                setCurrentTime(clipEndOnTimeline);
                                setTimeout(() => { justEndedRef.current = false; }, 300);
                                return;
                            }
                        }

                        if (trimRange.end > 0 && timelineTime >= trimRange.end) {
                            videoRef.current.pause();
                            syncAudioPlayback(timelineTime, false);
                            setIsPlaying(false);
                            justEndedRef.current = true;
                            setCurrentTime(trimRange.end);
                            setTimeout(() => { justEndedRef.current = false; }, 300);
                            return;
                        }

                        setCurrentTime(timelineTime);
                        syncAudioPlayback(timelineTime, true);
                    }
                } else {
                    const currentVideoTime = videoRef.current.currentTime;

                    if (trimRange.end > 0 && currentVideoTime >= trimRange.end) {
                        videoRef.current.pause();
                        syncAudioPlayback(currentVideoTime, false);
                        setIsPlaying(false);
                        justEndedRef.current = true;
                        setCurrentTime(trimRange.end);
                        setTimeout(() => { justEndedRef.current = false; }, 300);
                        return;
                    }

                    setCurrentTime(currentVideoTime);
                    syncAudioPlayback(currentVideoTime, true);
                }
            }
            if (isPlaying && !isDraggingPlayhead) {
                animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
            }
        };
    }, [isPlaying, isDraggingPlayhead, trimRange.end, syncAudioPlayback]);

    // Start/stop animation frame loop based on playing state
    useEffect(() => {
        if (isPlaying && !isDraggingPlayhead) {
            animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, isDraggingPlayhead]);

    const handleTimeUpdate = () => {
        if (videoRef.current && !isPlaying && !justEndedRef.current && !isSeekingToClipRef.current) {
            const clips = videoClipsRef.current;
            if (clips.length > 0 && activeClipDataRef.current) {
                const activeClip = activeClipDataRef.current;
                const offsetInClip = videoRef.current.currentTime - activeClip.trimStart;
                const timelineTime = activeClip.startTime + offsetInClip;
                setCurrentTime(timelineTime);
            } else {
                setCurrentTime(videoRef.current.currentTime);
            }
        }
    };

    const handlePlayheadDragStart = useCallback(() => {
        setIsDraggingPlayhead(true);
        // Pause video during scrubbing for smoother experience
        if (videoRef.current && !videoRef.current.paused) {
            wasPlayingBeforeDragRef.current = true;
            videoRef.current.pause();
        } else {
            wasPlayingBeforeDragRef.current = false;
        }
    }, []);

    const handlePlayheadDragEnd = useCallback(() => {
        setIsDraggingPlayhead(false);

        // Always read from ref — scrubTime state may still be stale at this point
        const finalTime = scrubTimeRef.current;

        // Set playhead position immediately (prevents visual jump)
        setCurrentTime(finalTime);

        if (videoRef.current) {
            const clips = videoClipsRef.current;

            if (clips.length > 0) {
                const clipAtTime = findActiveClipAtTime(finalTime);

                if (clipAtTime) {
                    const clipTime = timelineToClipTime(finalTime, clipAtTime);

                    if (clipAtTime.id !== activeClipIdRef.current) {
                        const url = videoUrlsRef.current.get(clipAtTime.libraryVideoId);
                        if (url) {
                            activeClipIdRef.current = clipAtTime.id;
                            activeClipDataRef.current = clipAtTime;
                            isSeekingToClipRef.current = true;
                            const currentVideo = videoRef.current;
                            currentVideo.src = url;

                            const shouldPlay = wasPlayingBeforeDragRef.current;
                            const onCanPlay = () => {
                                if (currentVideo) {
                                    currentVideo.playbackRate = 1.0;
                                    currentVideo.currentTime = clipTime;
                                    const clipHasAudio = clipAudioStateRef.current.get(clipAtTime.libraryVideoId);
                                    currentVideo.muted = muteOriginalAudioRef.current || clipHasAudio === false;
                                    isSeekingToClipRef.current = false;
                                    if (shouldPlay) {
                                        currentVideo.play().catch(e => {
                                            if (e.name !== 'AbortError') console.warn('Play interrupted:', e);
                                        });
                                        setIsPlaying(true);
                                        syncAudioPlayback(finalTime, true);
                                    } else {
                                        syncAudioPlayback(finalTime, false);
                                    }
                                }
                                currentVideo?.removeEventListener('canplay', onCanPlay);
                            };
                            currentVideo.addEventListener('canplay', onCanPlay);
                            return;
                        }
                    } else {
                        videoRef.current.currentTime = clipTime;
                    }
                }
            } else {
                videoRef.current.currentTime = finalTime;
            }
        }

        if (wasPlayingBeforeDragRef.current && videoRef.current) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name !== 'AbortError') {
                        console.warn('Play interrupted:', error);
                    }
                });
            }
            setIsPlaying(true);
            syncAudioPlayback(finalTime, true);
        } else {
            syncAudioPlayback(finalTime, false);
        }
    }, [syncAudioPlayback, findActiveClipAtTime, timelineToClipTime]);

    const handleZoomChange = useCallback((zoom: number) => {
        setTimelineZoom(zoom);
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = 1.0;

            const duration = videoRef.current.duration;
            if (isFinite(duration) && duration > 0) {
                const currentClips = videoClipsRef.current;
                if (currentClips.length <= 1) {
                    setVideoDuration(duration);
                    setTrimRange(prev => prev.end === 0 ? { start: 0, end: duration } : prev);
                }
            }
        }
    }, []);

    const skipBackward = useCallback(() => {
        if (videoRef.current) {
            const newTime = Math.max(trimRange.start, videoRef.current.currentTime - 5);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            syncAudioPlayback(newTime, isPlaying);
        }
    }, [trimRange.start, isPlaying, syncAudioPlayback]);

    const skipForward = useCallback(() => {
        if (videoRef.current) {
            const newTime = Math.min(trimRange.end, videoRef.current.currentTime + 5);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            syncAudioPlayback(newTime, isPlaying);

            if (newTime >= trimRange.end) {
                videoRef.current.pause();
                setIsPlaying(false);
                syncAudioPlayback(newTime, false);
            }
        }
    }, [trimRange.end, isPlaying, syncAudioPlayback]);

    const handleSeek = useCallback((time: number) => {
        scrubTimeRef.current = time;
        setScrubTime(time);
        setCurrentTime(time);

        if (videoRef.current && !isDraggingPlayhead) {
            const clips = videoClipsRef.current;

            if (clips.length > 0) {
                const clipAtTime = findActiveClipAtTime(time);

                if (clipAtTime) {
                    const clipTime = timelineToClipTime(time, clipAtTime);
                    const currentUrl = videoRef.current.src;
                    const targetUrl = videoUrlsRef.current.get(clipAtTime.libraryVideoId);
                    const needsClipSwitch = clipAtTime.id !== activeClipIdRef.current
                        || (targetUrl && currentUrl !== targetUrl);

                    if (needsClipSwitch && targetUrl) {
                        const wasPlaying = isPlaying;

                        if (videoRef.current && !videoRef.current.paused) {
                            videoRef.current.pause();
                        }
                        if (animationFrameRef.current) {
                            cancelAnimationFrame(animationFrameRef.current);
                            animationFrameRef.current = null;
                        }

                        activeClipIdRef.current = clipAtTime.id;
                        activeClipDataRef.current = clipAtTime;
                        isSeekingToClipRef.current = true;
                        isSwitchingClipRef.current = true;

                        const currentVideo = videoRef.current;
                        currentVideo.src = targetUrl;

                        const onCanPlay = () => {
                            if (currentVideo) {
                                currentVideo.playbackRate = 1.0;
                                currentVideo.currentTime = clipTime;
                                const clipHasAudio = clipAudioStateRef.current.get(clipAtTime.libraryVideoId);
                                currentVideo.muted = muteOriginalAudioRef.current || clipHasAudio === false;
                                isSeekingToClipRef.current = false;
                                isSwitchingClipRef.current = false;
                                clipSwitchTimeRef.current = null;

                                if (wasPlaying) {
                                    currentVideo.play().catch(e => {
                                        if (e.name !== 'AbortError') console.warn('Play interrupted:', e);
                                    });
                                    animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
                                }
                            }
                            currentVideo?.removeEventListener('canplay', onCanPlay);
                        };
                        currentVideo.addEventListener('canplay', onCanPlay);
                        syncAudioPlayback(time, false);
                        return;
                    } else {
                        if ('fastSeek' in videoRef.current && typeof videoRef.current.fastSeek === 'function') {
                            videoRef.current.fastSeek(clipTime);
                        } else {
                            videoRef.current.currentTime = clipTime;
                        }
                    }
                }
            } else {
                if ('fastSeek' in videoRef.current && typeof videoRef.current.fastSeek === 'function') {
                    videoRef.current.fastSeek(time);
                } else {
                    videoRef.current.currentTime = time;
                }
            }
            syncAudioPlayback(time, isPlaying);
        }
    }, [isDraggingPlayhead, isPlaying, syncAudioPlayback, findActiveClipAtTime, timelineToClipTime]);

    // Handler for background image upload (for ControlPanel)
    const handleImageUpload = useCallback(async (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
                setUploadedImages(prev => [dataUrl, ...prev]);
                setSelectedImageUrl(dataUrl);
            }
        };
        reader.readAsDataURL(file);
    }, []);

    const handleImageSelect = (url: string) => {
        if (backgroundTab === "wallpaper") {
            setUnsplashBgUrl(url);
        } else {
            setSelectedImageUrl(url);
        }
    };

    const handleWallpaperSelect = (index: number) => {
        setSelectedWallpaper(index);
        setUnsplashBgUrl("");
    };

    const handleImageRemove = (url: string) => {
        setUploadedImages(prev => prev.filter(img => img !== url));
        if (selectedImageUrl === url) {
            setSelectedImageUrl("");
        }
    };

    // Background tab change handler
    const handleBackgroundTabChange = (tab: BackgroundTab) => {
        setBackgroundTab(tab);
    };

    // Handler para cambio de color/gradiente
    const handleBackgroundColorChange = (config: BackgroundColorConfig) => {
        setBackgroundColorConfig(config);
    };

    // Zoom fragment handlers
    const handleSelectZoomFragment = useCallback((fragmentId: string | null) => {
        setSelectedZoomFragmentId(fragmentId);
        if (fragmentId) {
            setSelectedAudioTrackId(null);
            setSelectedVideoClipId(null);
            setSelectedSpotlightFragmentId(null);
            setSelectedMaskFragmentId(null);
            setSelectedElementId(null);
        }
    }, []);

    const handleActivateZoomTool = useCallback(() => {
        setActiveTool("zoom");
    }, []);

    // Default duration for new zoom fragments
    const DEFAULT_ZOOM_FRAGMENT_DURATION = 2;

    const handleAddZoomFragment = useCallback((startTime: number) => {
        // Find valid position avoiding overlaps - use ref to get latest fragments
        const validPosition = findValidFragmentPosition(
            startTime,
            DEFAULT_ZOOM_FRAGMENT_DURATION,
            zoomFragmentsRef.current,
            videoDuration
        );

        if (!validPosition) {
            return;
        }

        const newFragment = createZoomFragment(validPosition.startTime, validPosition.endTime);
        setZoomFragments(prev => [...prev, newFragment].sort((a, b) => a.startTime - b.startTime));
        setSelectedZoomFragmentId(newFragment.id);
        setActiveTool("zoom");
    }, [videoDuration]);

    const handleUpdateZoomFragment = useCallback((fragmentId: string, updates: Partial<ZoomFragment>) => {
        setZoomFragments(prev => prev.map(f =>
            f.id === fragmentId ? { ...f, ...updates } : f
        ).sort((a, b) => a.startTime - b.startTime));
    }, []);

    const handleDeleteZoomFragment = useCallback((fragmentId: string) => {
        setZoomFragments(prev => prev.filter(f => f.id !== fragmentId));
        if (selectedZoomFragmentId === fragmentId) {
            setSelectedZoomFragmentId(null);
        }
    }, [selectedZoomFragmentId]);

    // Get currently selected zoom fragment - memoized
    const selectedZoomFragment = useMemo(() =>
        zoomFragments.find(f => f.id === selectedZoomFragmentId) || null,
        [zoomFragments, selectedZoomFragmentId]
    );

    const handleSelectSpotlightFragment = useCallback((fragmentId: string | null) => {
        setSelectedSpotlightFragmentId(fragmentId);

        if (fragmentId) {
            const fragment = spotlightFragments.find((item) => item.id === fragmentId);

            if (fragment) {
                const targetTime = Math.max(0, fragment.startTime + 0.05);
                setCurrentTime(targetTime);
                setScrubTime(targetTime);

                if (videoRef.current) {
                    videoRef.current.currentTime = targetTime;
                }

                canvasRef.current?.drawFrame?.();
            }

            setSelectedZoomFragmentId(null);
            setSelectedAudioTrackId(null);
            setSelectedVideoClipId(null);
            setSelectedElementId(null);
            setSelectedMaskFragmentId(null);
            setActiveTool("spotlight");
        }
    }, [spotlightFragments]);

    const handleAddSpotlightFragment = useCallback((startTime: number) => {
        const safeStart = Math.max(0, Math.min(videoDuration, startTime));
        const duration = Math.min(DEFAULT_SPOTLIGHT_DURATION, Math.max(0.5, videoDuration - safeStart));

        if (duration <= 0) return;

        const newFragment = createSpotlightFragment(safeStart, duration);

        setSpotlightFragments((prev) => {
            const labeledFragment = {
                ...newFragment,
                label: `Spotlight ${prev.length + 1}`,
            };

            setSelectedSpotlightFragmentId(labeledFragment.id);
            return [...prev, labeledFragment].sort((a, b) => a.startTime - b.startTime);
        });
        setSelectedMaskFragmentId(null);
        setSelectedZoomFragmentId(null);
        setEffectInsertMode("spotlight");
        setActiveTool("spotlight");
    }, [videoDuration]);

    const handleUpdateSpotlightFragment = useCallback((fragmentId: string, updates: Partial<SpotlightFragment>) => {
        setSpotlightFragments((prev) => prev.map((fragment) => {
            if (fragment.id !== fragmentId) return fragment;

            const next = { ...fragment, ...updates };
            const minDuration = 0.2;

            next.startTime = Math.max(0, Math.min(videoDuration, next.startTime));
            next.endTime = Math.max(next.startTime + minDuration, Math.min(videoDuration, next.endTime));

            return next;
        }).sort((a, b) => a.startTime - b.startTime));
    }, [videoDuration]);

    const handleDeleteSpotlightFragment = useCallback((fragmentId: string) => {
        setSpotlightFragments((prev) => prev.filter((fragment) => fragment.id !== fragmentId));

        if (selectedSpotlightFragmentId === fragmentId) {
            setSelectedSpotlightFragmentId(null);
        }
    }, [selectedSpotlightFragmentId]);

    const selectedSpotlightFragment = useMemo(() =>
        spotlightFragments.find((fragment) => fragment.id === selectedSpotlightFragmentId) || null,
        [spotlightFragments, selectedSpotlightFragmentId]
    );

    const handleSelectMaskFragment = useCallback((fragmentId: string | null) => {
        setSelectedMaskFragmentId(fragmentId);

        if (fragmentId) {
            const fragment = maskFragments.find((item) => item.id === fragmentId);

            if (fragment) {
                const targetTime = Math.max(0, fragment.startTime + 0.05);
                setCurrentTime(targetTime);
                setScrubTime(targetTime);

                if (videoRef.current) {
                    videoRef.current.currentTime = targetTime;
                }

                canvasRef.current?.drawFrame?.();
            }

            setSelectedZoomFragmentId(null);
            setSelectedAudioTrackId(null);
            setSelectedVideoClipId(null);
            setSelectedElementId(null);
            setSelectedSpotlightFragmentId(null);
            setEffectInsertMode("mask");
            setActiveTool("mask");
        }
    }, [maskFragments]);

    const handleAddMaskFragment = useCallback((startTime: number) => {
        const safeStart = Math.max(0, Math.min(videoDuration, startTime));
        const duration = Math.min(DEFAULT_MASK_FRAGMENT_DURATION, Math.max(0.5, videoDuration - safeStart));

        if (duration <= 0) return;

        const newFragment = createEditableMaskFragment(safeStart, duration);

        setMaskFragments((prev) => {
            const labeledFragment = {
                ...newFragment,
                label: `Máscara ${prev.length + 1}`,
            };

            setSelectedMaskFragmentId(labeledFragment.id);
            return [...prev, labeledFragment].sort((a, b) => a.startTime - b.startTime);
        });
        setSelectedSpotlightFragmentId(null);
        setSelectedZoomFragmentId(null);
        setEffectInsertMode("mask");
        setActiveTool("mask");

        const targetTime = Math.max(0, safeStart + 0.05);
        setCurrentTime(targetTime);
        setScrubTime(targetTime);

        if (videoRef.current) {
            videoRef.current.currentTime = targetTime;
        }

        window.setTimeout(() => {
            canvasRef.current?.drawFrame?.();
        }, 0);
    }, [videoDuration]);

    const handleUpdateMaskFragment = useCallback((fragmentId: string, updates: Partial<EditableMaskFragment>) => {
        setMaskFragments((prev) => prev.map((fragment) => {
            if (fragment.id !== fragmentId) return fragment;

            const next = { ...fragment, ...updates };
            const minDuration = 0.2;

            next.startTime = Math.max(0, Math.min(videoDuration, next.startTime));
            next.endTime = Math.max(next.startTime + minDuration, Math.min(videoDuration, next.endTime));
            next.x = Math.max(0, Math.min(100, next.x));
            next.y = Math.max(0, Math.min(100, next.y));
            next.width = Math.max(4, Math.min(100, next.width));
            next.height = Math.max(4, Math.min(100, next.height));
            next.opacity = Math.max(0, Math.min(0.95, next.opacity));
            next.blur = Math.max(0, Math.min(40, next.blur));
            next.feather = Math.max(0, Math.min(40, next.feather ?? 12));
            next.pixelSize = Math.max(4, Math.min(32, next.pixelSize ?? 12));

            return next;
        }).sort((a, b) => a.startTime - b.startTime));
    }, [videoDuration]);

    const handleDeleteMaskFragment = useCallback((fragmentId: string) => {
        setMaskFragments((prev) => prev.filter((fragment) => fragment.id !== fragmentId));

        if (selectedMaskFragmentId === fragmentId) {
            setSelectedMaskFragmentId(null);
        }
    }, [selectedMaskFragmentId]);

    const handleDuplicateMaskFragment = useCallback((fragment: EditableMaskFragment) => {
        const duration = Math.max(0.2, fragment.endTime - fragment.startTime);
        const startTime = Math.min(Math.max(0, videoDuration - duration), fragment.endTime + 0.12);
        const copy: EditableMaskFragment = {
            ...fragment,
            id: `mask-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            startTime,
            endTime: Math.min(videoDuration, startTime + duration),
            label: `${fragment.label ?? "Máscara"} copy`,
        };

        setMaskFragments((prev) => [...prev, copy].sort((a, b) => a.startTime - b.startTime));
        setSelectedMaskFragmentId(copy.id);
        setSelectedSpotlightFragmentId(null);
        setSelectedZoomFragmentId(null);
        setEffectInsertMode("mask");
        setActiveTool("mask");

        const targetTime = Math.max(0, copy.startTime + 0.05);
        setCurrentTime(targetTime);
        setScrubTime(targetTime);
        if (videoRef.current) videoRef.current.currentTime = targetTime;
        window.setTimeout(() => canvasRef.current?.drawFrame?.(), 0);
    }, [videoDuration]);

    const selectedMaskFragment = useMemo(() =>
        maskFragments.find((fragment) => fragment.id === selectedMaskFragmentId) || null,
        [maskFragments, selectedMaskFragmentId]
    );

    // Calcular el CSS del background actual - memoized
    const backgroundColorCss = useMemo((): string | undefined => {
        if (backgroundTab === "color" && backgroundColorConfig) {
            if (backgroundColorConfig.type === "solid") {
                return backgroundColorConfig.config.color;
            } else {
                return gradientToCss(backgroundColorConfig.config);
            }
        }
        return undefined;
    }, [backgroundTab, backgroundColorConfig]);

    // Fullscreen toggle handler
    const toggleFullscreen = useCallback(async () => {
        if (!editorAreaRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await editorAreaRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (error) {
            console.error("Error toggling fullscreen:", error);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            // Also skip if inside a contenteditable element
            if ((e.target as HTMLElement)?.isContentEditable) return;

            // T key — Figma-style text tool: activate crosshair cursor to place text on canvas
            if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                setTextToolActive(true);
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedElementId) {
                e.preventDefault();
                copySelectedElement();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (isPhotoMode && !copiedElement) {
                    return;
                }
                e.preventDefault();
                pasteElement();
                return;
            }

            if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
                e.preventDefault();
                deleteCanvasElement(selectedElementId);
                return;
            }

            if ((e.key === "Delete" || e.key === "Backspace") && selectedVideoClipId) {
                e.preventDefault();
                handleDeleteVideoClip(selectedVideoClipId);
                return;
            }

            if ((e.key === "Delete" || e.key === "Backspace") && selectedAudioTrackId) {
                e.preventDefault();
                handleDeleteAudioTrack(selectedAudioTrackId);
                setSelectedAudioTrackId(null);
                return;
            }

            if ((e.key === "Delete" || e.key === "Backspace") && selectedZoomFragmentId) {
                e.preventDefault();
                handleDeleteZoomFragment(selectedZoomFragmentId);
                return;
            }

            if ((e.key === "Delete" || e.key === "Backspace") && selectedSpotlightFragmentId) {
                e.preventDefault();
                handleDeleteSpotlightFragment(selectedSpotlightFragmentId);
                return;
            }

            if ((e.key === "Delete" || e.key === "Backspace") && selectedMaskFragmentId) {
                e.preventDefault();
                handleDeleteMaskFragment(selectedMaskFragmentId);
                return;
            }

            if ((e.key === "Delete" || e.key === "Backspace") && selectedCaptionSegmentId) {
                e.preventDefault();
                handleDeleteCaptionSegment(selectedCaptionSegmentId);
                return;
            }

            if (e.key === "Escape") {
                e.preventDefault();
                if (textToolActive) {
                    setTextToolActive(false);
                    return;
                }
                if (selectedElementId) {
                    setSelectedElementId(null);
                } else if (selectedVideoClipId) {
                    setSelectedVideoClipId(null);
                } else if (selectedAudioTrackId) {
                    setSelectedAudioTrackId(null);
                } else if (selectedZoomFragmentId) {
                    setSelectedZoomFragmentId(null);
                } else if (selectedSpotlightFragmentId) {
                    setSelectedSpotlightFragmentId(null);
                } else if (selectedMaskFragmentId) {
                    setSelectedMaskFragmentId(null);
                } else if (selectedCaptionSegmentId) {
                    setSelectedCaptionSegmentId(null);
                }
            }

        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedElementId, selectedZoomFragmentId, selectedSpotlightFragmentId, selectedMaskFragmentId, selectedCaptionSegmentId, selectedAudioTrackId, selectedVideoClipId, deleteCanvasElement, handleDeleteZoomFragment, handleDeleteSpotlightFragment, handleDeleteMaskFragment, handleDeleteCaptionSegment, handleDeleteAudioTrack, handleDeleteVideoClip, copySelectedElement, pasteElement, isPhotoMode, copiedElement, textToolActive]);

    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768) {
                setIsControlPanelOpen(false);
            }
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleAspectRatioChange = useCallback((ratio: AspectRatio) => {
        setAspectRatio(ratio);
    }, []);

    const handleCustomDimensionsChange = useCallback((dimensions: { width: number; height: number }) => {
        setCustomDimensions(dimensions);
    }, []);

    const handleOpenCropper = useCallback(() => {
        setIsCropperOpen(true);
    }, []);

    const handleCloseCropper = useCallback(() => {
        setIsCropperOpen(false);
    }, []);

    const handleCropApply = useCallback((crop: CropArea) => {
        setCropArea(crop);
    }, []);

    // Only show camera if the active clip has camera support
    const activeClip = findActiveClipAtTime(currentTime);
    const shouldShowCamera = activeClip?.hasCamera === true;
    const effectiveCameraUrl = shouldShowCamera ? cameraUrl : null;

    return (
        <div className="flex flex-col h-screen w-full bg-[#0E0E12] text-white/60 font-sans overflow-hidden select-none">
            <div className="flex flex-1 overflow-hidden">
                <div className="hidden lg:flex">
                    <ToolsSidebar
                        activeTool={activeTool}
                        onToolChange={setActiveTool}
                        onVideoUpload={handleVideoUpload}
                        isUploading={isUploading}
                        selectedZoomFragmentId={selectedZoomFragmentId}
                        selectedAudioTrackId={selectedAudioTrackId}
                        selectedVideoClipId={selectedVideoClipId}
                        selectedElementId={selectedElementId}
                        newVideosCount={newVideosCount}
                        editorMode={editorMode}
                        onImageUpload={handleImageUploadToCanvas}
                        onScreenCapture={handleScreenCapture}
                        isCapturing={isCapturing}
                    />
                </div>

                <div className="hidden lg:block">
                    <AnimatePresence mode="wait">
                        {isControlPanelOpen && (
                            <motion.div
                                key="control-panel"
                                initial={{ x: -320, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -320, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                <Suspense fallback={
                                    <div className="w-[320px] h-screen bg-[#141417] border-r border-white/10 flex items-center justify-center">
                                        <LoadingSpinner message="Cargando panel..." />
                                    </div>
                                }>
                                    <ControlPanel
                                        activeTool={activeTool}
                                        backgroundTab={backgroundTab}
                                        onVideoAudioToggle={handleVideoAudioToggle}
                                        onBackgroundTabChange={handleBackgroundTabChange}
                                        selectedWallpaper={selectedWallpaper}
                                        onWallpaperSelect={handleWallpaperSelect}
                                        backgroundBlur={backgroundBlur}
                                        onBackgroundBlurChange={setBackgroundBlur}
                                        padding={padding}
                                        onPaddingChange={setPadding}
                                        roundedCorners={roundedCorners}
                                        onRoundedCornersChange={handleRoundedCornersChange}
                                        shadows={shadows}
                                        onShadowsChange={setShadows}
                                        uploadedImages={uploadedImages}
                                        selectedImageUrl={selectedImageUrl}
                                        onImageUpload={handleImageUpload}
                                        onImageSelect={handleImageSelect}
                                        onImageRemove={handleImageRemove}
                                        backgroundColorConfig={backgroundColorConfig}
                                        onBackgroundColorChange={handleBackgroundColorChange}
                                        onTogglePanel={() => setIsControlPanelOpen(!isControlPanelOpen)}
                                        isOpen={isControlPanelOpen}
                                        zoomFragments={zoomFragments}
                                        selectedZoomFragment={selectedZoomFragment}
                                        onSelectZoomFragment={handleSelectZoomFragment}
                                        onAddZoomFragment={() => handleAddZoomFragment(currentTime)}
                                        onUpdateZoomFragment={handleUpdateZoomFragment}
                                        onDeleteZoomFragment={handleDeleteZoomFragment}
                                        videoUrl={videoUrl}
                                        videoThumbnail={selectedZoomFragment ? getThumbnailForTime(selectedZoomFragment.startTime)?.dataUrl ?? null : null}
                                        currentTime={currentTime}
                                        getThumbnailForTime={getThumbnailForTime}
                                        videoDimensions={customAspectRatio}
                                        mockupId={mockupId}
                                        mockupConfig={mockupConfig}
                                        onMockupChange={handleMockupChange}
                                        onMockupConfigChange={handleMockupConfigChange}
                                        onAddCanvasElement={addCanvasElement}
                                        selectedCanvasElement={canvasElements.find(el => el.id === selectedElementId) || null}
                                        onUpdateCanvasElement={updateCanvasElement}
                                        onDeleteCanvasElement={deleteCanvasElement}
                                        onBringToFront={bringToFront}
                                        onSendToBack={sendToBack}
                                        uploadedAudios={uploadedAudios}
                                        audioTracks={audioTracks}
                                        muteOriginalAudio={muteOriginalAudio}
                                        masterVolume={masterVolume}
                                        onAudioUpload={handleAudioUpload}
                                        onAudioDelete={handleAudioDelete}
                                        onAddAudioTrack={handleAddAudioTrack}
                                        onUpdateAudioTrack={handleUpdateAudioTrack}
                                        onDeleteAudioTrack={handleDeleteAudioTrack}
                                        onExtendProjectToAudioDuration={handleExtendProjectToAudioDuration}
                                        onToggleMuteOriginalAudio={handleToggleMuteOriginalAudio}
                                        onMasterVolumeChange={handleMasterVolumeChange}
                                        videoDuration={videoDuration}
                                        onAddVideoToTrack={handleAddVideoToTrack}
                                        onRemoveVideoFromTrack={handleRemoveVideoFromTrack}
                                        onVideoUploadToLibrary={handleVideoUploadToLibrary}
                                        onVideoDeleteFromTrack={handleDeleteVideoFromLibrary}
                                        videosInTrackIds={videosInTrackIds}
                                        videosLibraryRefresh={videosLibraryRefresh}
                                        isVideoUploading={isUploading}
                                        cameraUrl={cameraUrl}
                                        cameraConfig={cameraConfig}
                                        onCameraConfigChange={handleCameraConfigChange}
                                        imageProjects={imageProjects}
                                        currentImageProjectId={currentProject?.id || null}
                                        isLoadingProjects={isLoadingProjects}
                                        onSelectImageProject={handleSelectImageProject}
                                        onAddImageToCanvas={handleAddImageToCanvas}
                                        onDeleteImageProject={handleDeleteImageProject}
                                        onUploadImageToHistory={handleUploadImageToHistory}
                                        elementsTextTabTrigger={elementsTextTabTrigger}
                                        cursorConfig={cursorConfig}
                                        cursorData={cursorData}
                                        onCursorConfigChange={handleCursorConfigChange}
                                        isRecordedVideo={isRecordedVideo}
                                    />
                                </Suspense>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div
                    ref={editorAreaRef}
                    className="flex-1 bg-[#09090B] flex flex-col relative overflow-hidden min-w-0"
                >
                    <AnimatePresence>
                        {!isControlPanelOpen && (
                            <TooltipAction label="Abrir panel de control" side="right">
                                <motion.button
                                    initial={{ x: -100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -100, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut", delay: 0.15 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsControlPanelOpen(true)}
                                    className="absolute top-2 left-4 z-50 p-2 flex items-center gap-2 squircle-element bg-[#18181b] border border-white/10 text-white hover:bg-[#252529] transition-all duration-200 shadow-lg"
                                >
                                    <Link href="/" className="block sm:hidden"><Image src="/svg/logo-openvid.svg" alt="Logo" width={24} height={24} className="hover:opacity-80 transition-opacity" /></Link>
                                    <Icon icon="lucide:sidebar-open" width="20" className="hidden sm:block"
                                    />
                                </motion.button>
                            </TooltipAction>
                        )}
                    </AnimatePresence>

                    <VideoCanvas
                        layersPanelToolbar={
                            <EditorTopBar
                                onExport={handleExport}
                                exportProgress={exportProgress}
                                hasTransparentBackground={selectedWallpaper === -1}
                                onUndo={undo}
                                onRedo={redo}
                                canUndo={canUndo}
                                canRedo={canRedo}
                                editorMode={editorMode}
                                onImageExport={handleImageExport}
                                imageExportProgress={imageExportProgress}
                                canvasWidth={customAspectRatio?.width || 1920}
                                canvasHeight={customAspectRatio?.height || 1080}
                            />
                        }
                        ref={canvasRef}
                        videoUrl={videoUrl}
                        videoRef={videoRef}
                        mediaType={isPhotoMode ? "image" : "video"}
                        imageUrl={imageUrl}
                        imageRef={imageRef}
                        imageTransform={imageTransform}
                        apply3DToBackground={apply3DToBackground}
                        imageMaskConfig={imageMaskConfig}
                        videoMaskConfig={videoMaskConfig}
                        onVideoMaskConfigChange={setVideoMaskConfig}
                        padding={padding}
                        roundedCorners={roundedCorners}
                        shadows={shadows}
                        aspectRatio={aspectRatio}
                        customAspectRatio={customAspectRatio}
                        cropArea={cropArea}
                        backgroundTab={backgroundTab}
                        selectedWallpaper={selectedWallpaper}
                        backgroundBlur={backgroundBlur}
                        selectedImageUrl={selectedImageUrl}
                        unsplashOverrideUrl={unsplashBgUrl}
                        backgroundColorCss={backgroundColorCss}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        isScrubbing={isDraggingPlayhead}
                        scrubTime={scrubTime}
                        getThumbnailForTime={getThumbnailForTime}
                        zoomFragments={zoomFragments}
                        currentTime={currentTime}
                        mockupId={mockupId}
                        mockupConfig={mockupConfig ?? DEFAULT_MOCKUP_CONFIG}
                        onVideoUpload={handleVideoUpload}
                        onImageUpload={handleImageUploadToCanvas}
                        onImageDrop={handleImageDrop}
                        isUploading={isUploading}
                        videoTransform={videoTransform}
                        onVideoTransformChange={setVideoTransform}
                        canvasElements={canvasElements}
                        selectedElementId={selectedElementId}
                        onElementUpdate={updateCanvasElement}
                        onElementSelect={selectCanvasElement}
                        onElementDelete={deleteCanvasElement}
                        onAddElement={addCanvasElement}
                        textToolActive={textToolActive}
                        onTextToolDeactivate={() => setTextToolActive(false)}
                        cameraUrl={effectiveCameraUrl}
                        cameraConfig={cameraConfig}
                        cursorConfig={cursorConfig}
                        cursorData={cursorData}
                        isRecordedVideo={isRecordedVideo}
                        isPlaying={isPlaying}
                        spotlightFragments={spotlightFragments}
                        selectedSpotlightFragmentId={selectedSpotlightFragmentId}
                        onSelectSpotlightFragment={handleSelectSpotlightFragment}
                        onUpdateSpotlightFragment={handleUpdateSpotlightFragment}
                        maskFragments={maskFragments}
                        selectedMaskFragmentId={selectedMaskFragmentId}
                        onSelectMaskFragment={handleSelectMaskFragment}
                        onUpdateMaskFragment={handleUpdateMaskFragment}
                        captionSegments={captionSegments}
                        captionSettings={captionSettings}
                        selectedCaptionSegmentId={selectedCaptionSegmentId}
                        onSelectCaptionSegment={handleSelectCaptionSegment}
                        onCameraConfigChange={handleCameraConfigChange}
                        onCameraClick={handleCameraClick}
                        onEnded={() => {
                            const clips = videoClipsRef.current;
                            if (clips.length > 1) {
                                const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
                                const currentIndex = sortedClips.findIndex(c => c.id === activeClipIdRef.current);
                                if (currentIndex >= 0 && currentIndex < sortedClips.length - 1) {
                                    return;
                                }
                            }

                            setIsPlaying(false);
                            justEndedRef.current = true;
                            const endTime = trimRange.end > 0 ? trimRange.end : videoDuration;
                            setCurrentTime(endTime);
                            setTimeout(() => {
                                justEndedRef.current = false;
                            }, 300);
                        }}
                    />

                    {isVideoMode && (activeTool === "captions" || selectedCaptionSegment) && (
                        <motion.div
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.98 }}
                            data-caption-editor-panel
                            className="absolute right-4 top-16 z-[82] w-[340px] rounded-2xl border border-cyan-300/20 bg-[#111113]/95 p-4 text-white shadow-2xl backdrop-blur-xl"
                        >
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
                                        <Icon icon="solar:subtitles-bold" width="19" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-white">Subtítulos</div>
                                        <div className="text-[11px] text-white/45">Estilo cinematográfico</div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCaptionSegmentId(null);
                                        if (activeTool === "captions") setActiveTool("videos");
                                    }}
                                    className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
                                    aria-label="Cerrar editor de subtítulos"
                                >
                                    <Icon icon="solar:close-circle-bold" width="18" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                                    <div>
                                        <div className="text-sm font-semibold text-white">Mostrar subtítulos</div>
                                        <div className="text-xs text-white/45">Preview y export</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateCaptionSettings({ enabled: !captionSettings.enabled })}
                                        className={`relative h-8 w-14 rounded-full transition ${captionSettings.enabled ? "bg-cyan-400" : "bg-white/15"}`}
                                    >
                                        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${captionSettings.enabled ? "left-7" : "left-1"}`} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        ["minimal", "Mínimo"],
                                        ["cinematic", "Cinemático"],
                                        ["bold", "Intenso"],
                                        ["creator", "Creador"],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => handleUpdateCaptionSettings({ preset: value as CaptionSettings["preset"] })}
                                            className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${captionSettings.preset === value ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white"}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-medium text-white/55">Posición vertical</span>
                                    <input type="range" min={55} max={92} step={1} value={captionSettings.positionY} onChange={(event) => handleUpdateCaptionSettings({ positionY: Number(event.target.value) })} className="w-full accent-cyan-300" />
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-medium text-white/55">Tamaño</span>
                                    <input type="range" min={24} max={72} step={1} value={captionSettings.fontSize} onChange={(event) => handleUpdateCaptionSettings({ fontSize: Number(event.target.value) })} className="w-full accent-cyan-300" />
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-medium text-white/55">Ancho máximo</span>
                                    <input type="range" min={40} max={92} step={1} value={captionSettings.maxWidth} onChange={(event) => handleUpdateCaptionSettings({ maxWidth: Number(event.target.value) })} className="w-full accent-cyan-300" />
                                </label>

                                {selectedCaptionSegment ? (
                                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                                        <textarea
                                            value={selectedCaptionSegment.text}
                                            onChange={(event) => handleUpdateCaptionSegment(selectedCaptionSegment.id, { text: event.target.value })}
                                            className="min-h-20 w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] text-white/45">Inicio</span>
                                                <input type="number" min={0} max={videoDuration} step={0.1} value={Number(selectedCaptionSegment.startTime.toFixed(1))} onChange={(event) => handleUpdateCaptionSegment(selectedCaptionSegment.id, { startTime: Number(event.target.value) })} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white outline-none" />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] text-white/45">Fin</span>
                                                <input type="number" min={0} max={videoDuration} step={0.1} value={Number(selectedCaptionSegment.endTime.toFixed(1))} onChange={(event) => handleUpdateCaptionSegment(selectedCaptionSegment.id, { endTime: Number(event.target.value) })} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white outline-none" />
                                            </label>
                                        </div>
                                        <button type="button" onClick={() => handleDeleteCaptionSegment(selectedCaptionSegment.id)} className="w-full rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/25">Eliminar subtítulo</button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={handleAddDemoCaptions} className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">Agregar subtítulos demo</button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {isVideoMode && activeTool === "spotlight" && selectedSpotlightFragment && (
                        <motion.div
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.98 }}
                            data-effect-editor-panel
                            className="absolute right-4 top-16 z-[80] w-[320px] rounded-2xl border border-amber-400/20 bg-[#111113]/95 p-4 text-white shadow-2xl backdrop-blur-xl"
                        >
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                                        <Icon icon="solar:flashlight-on-bold" width="18" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-white">Spotlight</div>
                                        <div className="text-[11px] text-white/45">Fragmento seleccionado</div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedSpotlightFragmentId(null)}
                                    className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
                                    aria-label="Cerrar editor de spotlight"
                                >
                                    <Icon icon="solar:close-circle-bold" width="18" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-medium text-white/55">Nombre</span>
                                    <input
                                        value={selectedSpotlightFragment.label ?? "Spotlight"}
                                        onChange={(event) => handleUpdateSpotlightFragment(selectedSpotlightFragment.id, { label: event.target.value })}
                                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition focus:border-amber-300/50"
                                    />
                                </label>

                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Inicio</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={videoDuration}
                                            step={0.1}
                                            value={Number(selectedSpotlightFragment.startTime.toFixed(1))}
                                            onChange={(event) => {
                                                const startTime = Number(event.target.value);
                                                const duration = selectedSpotlightFragment.endTime - selectedSpotlightFragment.startTime;
                                                handleUpdateSpotlightFragment(selectedSpotlightFragment.id, {
                                                    startTime,
                                                    endTime: Math.min(videoDuration, startTime + duration),
                                                });
                                            }}
                                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition focus:border-amber-300/50"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Fin</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={videoDuration}
                                            step={0.1}
                                            value={Number(selectedSpotlightFragment.endTime.toFixed(1))}
                                            onChange={(event) => handleUpdateSpotlightFragment(selectedSpotlightFragment.id, { endTime: Number(event.target.value) })}
                                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition focus:border-amber-300/50"
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">X</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            value={selectedSpotlightFragment.x}
                                            onChange={(event) => handleUpdateSpotlightFragment(selectedSpotlightFragment.id, { x: Number(event.target.value) })}
                                            className="w-full accent-amber-400"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Y</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            value={selectedSpotlightFragment.y}
                                            onChange={(event) => handleUpdateSpotlightFragment(selectedSpotlightFragment.id, { y: Number(event.target.value) })}
                                            className="w-full accent-amber-400"
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Ancho</span>
                                        <input
                                            type="range"
                                            min={4}
                                            max={100}
                                            step={0.5}
                                            value={selectedSpotlightFragment.width}
                                            onChange={(event) => handleUpdateSpotlightFragment(selectedSpotlightFragment.id, { width: Number(event.target.value) })}
                                            className="w-full accent-amber-400"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Alto</span>
                                        <input
                                            type="range"
                                            min={4}
                                            max={100}
                                            step={0.5}
                                            value={selectedSpotlightFragment.height}
                                            onChange={(event) => handleUpdateSpotlightFragment(selectedSpotlightFragment.id, { height: Number(event.target.value) })}
                                            className="w-full accent-amber-400"
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Forma</span>
                                        <select
                                            value={selectedSpotlightFragment.shape}
                                            onChange={(event) => handleUpdateSpotlightFragment(selectedSpotlightFragment.id, { shape: event.target.value as SpotlightFragment["shape"] })}
                                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition focus:border-amber-300/50"
                                        >
                                            <option value="rounded">Redondeado</option>
                                            <option value="rectangle">Rectángulo</option>
                                            <option value="circle">Círculo</option>
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Radio</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={60}
                                            step={1}
                                            value={selectedSpotlightFragment.radius ?? 18}
                                            onChange={(event) => handleUpdateSpotlightFragment(selectedSpotlightFragment.id, { radius: Number(event.target.value) })}
                                            className="w-full accent-amber-400"
                                        />
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-medium text-white/55">Oscurecimiento</span>
                                    <input
                                        type="range"
                                        min={0.1}
                                        max={0.92}
                                        step={0.01}
                                        value={selectedSpotlightFragment.intensity}
                                        onChange={(event) => handleUpdateSpotlightFragment(selectedSpotlightFragment.id, { intensity: Number(event.target.value) })}
                                        className="w-full accent-amber-400"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-medium text-white/55">Blur</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={12}
                                        step={0.5}
                                        value={selectedSpotlightFragment.blur}
                                        onChange={(event) => handleUpdateSpotlightFragment(selectedSpotlightFragment.id, { blur: Number(event.target.value) })}
                                        className="w-full accent-amber-400"
                                    />
                                </label>

                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const duration = selectedSpotlightFragment.endTime - selectedSpotlightFragment.startTime;
                                            const copy = {
                                                ...selectedSpotlightFragment,
                                                id: `spotlight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                                                startTime: Math.min(videoDuration - 0.2, selectedSpotlightFragment.endTime),
                                                endTime: Math.min(videoDuration, selectedSpotlightFragment.endTime + duration),
                                                label: `${selectedSpotlightFragment.label ?? "Spotlight"} copy`,
                                            };

                                            setSpotlightFragments((prev) => [...prev, copy].sort((a, b) => a.startTime - b.startTime));
                                            setSelectedSpotlightFragmentId(copy.id);
                                            setSelectedMaskFragmentId(null);
                                            setEffectInsertMode("spotlight");
                                            setActiveTool("spotlight");
                                        }}
                                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10"
                                    >
                                        Duplicar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteSpotlightFragment(selectedSpotlightFragment.id)}
                                        className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}



                    {isVideoMode && activeTool === "mask" && !isPlaying && selectedMaskFragment && (
                        <motion.div
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.98 }}
                            data-effect-editor-panel
                            className="absolute right-4 top-16 z-[80] w-[320px] rounded-2xl border border-fuchsia-400/20 bg-[#111113]/95 p-4 text-white shadow-2xl backdrop-blur-xl"
                        >
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-400/15 text-fuchsia-300">
                                        <Icon icon="solar:mask-happly-bold" width="18" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-white">Máscara editable</div>
                                        <div className="text-[11px] text-white/45">Fragmento seleccionado</div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedMaskFragmentId(null)}
                                    className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
                                    aria-label="Cerrar editor de máscara"
                                >
                                    <Icon icon="solar:close-circle-bold" width="18" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-medium text-white/55">Nombre</span>
                                    <input
                                        value={selectedMaskFragment.label ?? "Máscara"}
                                        onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { label: event.target.value })}
                                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition focus:border-fuchsia-300/50"
                                    />
                                </label>

                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Inicio</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={videoDuration}
                                            step={0.1}
                                            value={Number(selectedMaskFragment.startTime.toFixed(1))}
                                            onChange={(event) => {
                                                const startTime = Number(event.target.value);
                                                const duration = selectedMaskFragment.endTime - selectedMaskFragment.startTime;
                                                handleUpdateMaskFragment(selectedMaskFragment.id, {
                                                    startTime,
                                                    endTime: Math.min(videoDuration, startTime + duration),
                                                });
                                            }}
                                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition focus:border-fuchsia-300/50"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Fin</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={videoDuration}
                                            step={0.1}
                                            value={Number(selectedMaskFragment.endTime.toFixed(1))}
                                            onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { endTime: Number(event.target.value) })}
                                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition focus:border-fuchsia-300/50"
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">X</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            value={selectedMaskFragment.x}
                                            onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { x: Number(event.target.value) })}
                                            className="w-full accent-fuchsia-400"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Y</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            value={selectedMaskFragment.y}
                                            onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { y: Number(event.target.value) })}
                                            className="w-full accent-fuchsia-400"
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Ancho</span>
                                        <input
                                            type="range"
                                            min={4}
                                            max={100}
                                            step={0.5}
                                            value={selectedMaskFragment.width}
                                            onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { width: Number(event.target.value) })}
                                            className="w-full accent-fuchsia-400"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Alto</span>
                                        <input
                                            type="range"
                                            min={4}
                                            max={100}
                                            step={0.5}
                                            value={selectedMaskFragment.height}
                                            onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { height: Number(event.target.value) })}
                                            className="w-full accent-fuchsia-400"
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Forma</span>
                                        <select
                                            value={selectedMaskFragment.shape}
                                            onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { shape: event.target.value as EditableMaskFragment["shape"] })}
                                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition focus:border-fuchsia-300/50"
                                        >
                                            <option value="rounded">Redondeado</option>
                                            <option value="rectangle">Rectángulo</option>
                                            <option value="circle">Círculo</option>
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Radio</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={60}
                                            step={1}
                                            value={selectedMaskFragment.radius ?? 18}
                                            onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { radius: Number(event.target.value) })}
                                            className="w-full accent-fuchsia-400"
                                        />
                                    </label>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-2">
                                    <div className="mb-2 text-[11px] font-medium text-white/55">Presets rápidos</div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {(Object.entries(MASK_PRESET_LABELS) as Array<[EditableMaskPreset, string]>).map(([preset, label]) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => {
                                                    const next = applyMaskPresetDefaults(selectedMaskFragment, preset);
                                                    handleUpdateMaskFragment(selectedMaskFragment.id, {
                                                        preset: next.preset,
                                                        label: next.label,
                                                        opacity: next.opacity,
                                                        blur: next.blur,
                                                        feather: next.feather,
                                                        pixelSize: next.pixelSize,
                                                    });
                                                }}
                                                className={`rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition ${
                                                    (selectedMaskFragment.preset ?? "blur") === preset
                                                        ? "border-fuchsia-300/50 bg-fuchsia-400/15 text-fuchsia-100"
                                                        : "border-white/10 bg-black/20 text-white/55 hover:bg-white/10 hover:text-white"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-medium text-white/55">Opacidad</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={0.95}
                                        step={0.01}
                                        value={selectedMaskFragment.opacity}
                                        onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { opacity: Number(event.target.value) })}
                                        className="w-full accent-fuchsia-400"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-medium text-white/55">Blur</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={40}
                                        step={0.5}
                                        value={selectedMaskFragment.blur}
                                        onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { blur: Number(event.target.value) })}
                                        className="w-full accent-fuchsia-400"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-medium text-white/55">Feather</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={40}
                                        step={1}
                                        value={selectedMaskFragment.feather ?? 12}
                                        onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { feather: Number(event.target.value) })}
                                        className="w-full accent-fuchsia-400"
                                    />
                                </label>

                                {(selectedMaskFragment.preset ?? "blur") === "pixelate" && (
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-medium text-white/55">Tamaño pixel</span>
                                        <input
                                            type="range"
                                            min={4}
                                            max={32}
                                            step={1}
                                            value={selectedMaskFragment.pixelSize ?? 12}
                                            onChange={(event) => handleUpdateMaskFragment(selectedMaskFragment.id, { pixelSize: Number(event.target.value) })}
                                            className="w-full accent-fuchsia-400"
                                        />
                                    </label>
                                )}

                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => handleDuplicateMaskFragment(selectedMaskFragment)}
                                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10"
                                    >
                                        Duplicar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteMaskFragment(selectedMaskFragment.id)}
                                        className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Video mode: Show player controls and timeline */}
                    {isVideoMode && (
                        <>
                            <PlayerControls
                                isPlaying={isPlaying}
                                currentTime={currentTime}
                                videoDuration={videoDuration}
                                aspectRatio={aspectRatio}
                                customAspectRatio={aspectRatio === "custom" ? customDimensions : videoDimensions}
                                isFullscreen={isFullscreen}
                                zoomLevel={timelineZoom}
                                onTogglePlayPause={togglePlayPause}
                                onSkipBackward={skipBackward}
                                onSkipForward={skipForward}
                                onToggleFullscreen={toggleFullscreen}
                                onAspectRatioChange={handleAspectRatioChange}
                                onCustomAspectRatioChange={handleCustomDimensionsChange}
                                onOpenCropper={handleOpenCropper}
                                onZoomChange={handleZoomChange}
                                videoMaskConfig={videoMaskConfig}
                                onVideoMaskConfigChange={setVideoMaskConfig}
                                videoPreviewImageUrl={getThumbnailForTime(currentDisplayTime)?.dataUrl ?? null}
                                effectInsertMode={effectInsertMode}
                                onEffectInsertModeChange={(mode) => {
                                    setEffectInsertMode(mode);
                                    setActiveTool(mode === "spotlight" ? "spotlight" : "mask");
                                    if (mode === "spotlight") {
                                        setSelectedMaskFragmentId(null);
                                    } else {
                                        setSelectedSpotlightFragmentId(null);
                                    }
                                }}
                            />

                            <Suspense fallback={<TimelineSkeleton />}>
                                <Timeline
                                    videoDuration={videoDuration}
                                    currentTime={currentTime}
                                    onSeek={handleSeek}
                                    videoUrl={videoUrl}
                                    zoomLevel={timelineZoom}
                                    isDraggingPlayhead={isDraggingPlayhead}
                                    onDragStart={handlePlayheadDragStart}
                                    onDragEnd={handlePlayheadDragEnd}
                                    trimRange={trimRange}
                                    onTrimChange={setTrimRange}
                                    videoClips={videoClips}
                                    selectedVideoClipId={selectedVideoClipId}
                                    onSelectVideoClip={handleSelectVideoClip}
                                    onUpdateVideoClip={handleUpdateVideoClip}
                                    onDeleteVideoClip={handleDeleteVideoClip}
                                    zoomFragments={zoomFragments}
                                    selectedZoomFragmentId={selectedZoomFragmentId}
                                    onSelectZoomFragment={handleSelectZoomFragment}
                                    onAddZoomFragment={handleAddZoomFragment}
                                    onUpdateZoomFragment={handleUpdateZoomFragment}
                                    onActivateZoomTool={handleActivateZoomTool}
                                    spotlightFragments={spotlightFragments}
                                    selectedSpotlightFragmentId={selectedSpotlightFragmentId}
                                    onSelectSpotlightFragment={handleSelectSpotlightFragment}
                                    onAddSpotlightFragment={handleAddSpotlightFragment}
                                    onUpdateSpotlightFragment={handleUpdateSpotlightFragment}
                                    maskFragments={maskFragments}
                                    selectedMaskFragmentId={selectedMaskFragmentId}
                                    onSelectMaskFragment={handleSelectMaskFragment}
                                    onAddMaskFragment={handleAddMaskFragment}
                                    onUpdateMaskFragment={handleUpdateMaskFragment}
                                    onDuplicateMaskFragment={handleDuplicateMaskFragment}
                                    effectInsertMode={effectInsertMode}
                                    captionSegments={captionSegments}
                                    selectedCaptionSegmentId={selectedCaptionSegmentId}
                                    onSelectCaptionSegment={handleSelectCaptionSegment}
                                    onUpdateCaptionSegment={handleUpdateCaptionSegment}
                                    audioTracks={audioTracks}
                                    uploadedAudios={uploadedAudios}
                                    selectedAudioTrackId={selectedAudioTrackId}
                                    onSelectAudioTrack={handleSelectAudioTrack}
                                    onUpdateAudioTrack={handleUpdateAudioTrack}
                                />
                            </Suspense>
                        </>
                    )}

                    {/* Photo mode: Show placeholder instead of timeline */}
                    {isPhotoMode && (
                        <Suspense fallback={<TimelineSkeleton />}>
                            <PhotoEditorPlaceholder
                                canvasImageUrl={canvasImageUrl}
                                staticImageUrl={imageUrl}
                                onSelectPreview={handleSelectPreview}
                                selectedPreviewId={selectedPreviewId}
                                aspectRatio={aspectRatio}
                                onAspectRatioChange={handleAspectRatioChange}
                                customAspectRatio={customAspectRatio}
                                onCustomAspectRatioChange={handleCustomDimensionsChange}
                                onOpenCropper={handleOpenCropper}
                                apply3DToBackground={apply3DToBackground}
                                onToggle3DBackground={handleToggle3DBackground}
                                imageMaskConfig={imageMaskConfig}
                                onImageMaskConfigChange={setImageMaskConfig}
                                imageTransform={imageTransform}
                                onReset={handleResetPhotoEditor}
                            />
                        </Suspense>
                    )}

                </div>

            </div>

            <MobileToolsMenu
                activeTool={activeTool}
                onToolChange={setActiveTool}
                onVideoUpload={handleVideoUpload}
                isUploading={isUploading}
                onOpenToolPanel={() => setIsMobileControlPanelOpen(true)}
            />

            <MobileControlPanel
                isOpen={isMobileControlPanelOpen}
                onClose={() => setIsMobileControlPanelOpen(false)}
                activeTool={activeTool}
                backgroundTab={backgroundTab}
                onBackgroundTabChange={handleBackgroundTabChange}
                selectedWallpaper={selectedWallpaper}
                onWallpaperSelect={handleWallpaperSelect}
                backgroundBlur={backgroundBlur}
                onBackgroundBlurChange={setBackgroundBlur}
                padding={padding}
                onPaddingChange={setPadding}
                roundedCorners={roundedCorners}
                onRoundedCornersChange={handleRoundedCornersChange}
                shadows={shadows}
                onShadowsChange={setShadows}
                uploadedImages={uploadedImages}
                selectedImageUrl={selectedImageUrl}
                onImageUpload={handleImageUpload}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                backgroundColorConfig={backgroundColorConfig}
                onBackgroundColorChange={handleBackgroundColorChange}
                zoomFragments={zoomFragments}
                selectedZoomFragment={selectedZoomFragment}
                onSelectZoomFragment={handleSelectZoomFragment}
                onAddZoomFragment={() => handleAddZoomFragment(currentTime)}
                onUpdateZoomFragment={handleUpdateZoomFragment}
                onDeleteZoomFragment={handleDeleteZoomFragment}
                videoUrl={videoUrl}
                videoThumbnail={selectedZoomFragment ? getThumbnailForTime(selectedZoomFragment.startTime)?.dataUrl ?? null : null}
                currentTime={currentTime}
                getThumbnailForTime={getThumbnailForTime}
                videoDimensions={videoDimensions}
                mockupId={mockupId}
                mockupConfig={mockupConfig}
                onMockupChange={handleMockupChange}
                onMockupConfigChange={handleMockupConfigChange}
                onAddCanvasElement={addCanvasElement}
                selectedCanvasElement={canvasElements.find(el => el.id === selectedElementId) || null}
                onUpdateCanvasElement={updateCanvasElement}
                onDeleteCanvasElement={deleteCanvasElement}
                onBringToFront={bringToFront}
                onSendToBack={sendToBack}
                uploadedAudios={uploadedAudios}
                audioTracks={audioTracks}
                muteOriginalAudio={muteOriginalAudio}
                masterVolume={masterVolume}
                onAudioUpload={handleAudioUpload}
                onAudioDelete={handleAudioDelete}
                onAddAudioTrack={handleAddAudioTrack}
                onUpdateAudioTrack={handleUpdateAudioTrack}
                onDeleteAudioTrack={handleDeleteAudioTrack}
                onExtendProjectToAudioDuration={handleExtendProjectToAudioDuration}
                onToggleMuteOriginalAudio={handleToggleMuteOriginalAudio}
                onMasterVolumeChange={handleMasterVolumeChange}
                videoDuration={videoDuration}
                cursorConfig={cursorConfig}
                onCursorConfigChange={handleCursorConfigChange}
                isRecordedVideo={isRecordedVideo}
            />

            <Suspense fallback={null}>
                <ExportOverlay
                    exportProgress={exportProgress}
                    onCancel={cancelExport}
                    isTransparentExport={selectedWallpaper === -1}
                />
            </Suspense>
            <Suspense fallback={null}>
                {isVideoMode ? (
                    <VideoCropperModal
                        isOpen={isCropperOpen}
                        onClose={handleCloseCropper}
                        videoUrl={videoUrl}
                        onCropApply={handleCropApply}
                        initialCrop={cropArea}
                    />
                ) : (
                    <ImageCropperModal
                        isOpen={isCropperOpen}
                        onClose={handleCloseCropper}
                        imageUrl={imageUrl}
                        onCropApply={handleCropApply}
                        initialCrop={cropArea}
                    />
                )}
            </Suspense>

            {autoTrimModalOpen && pendingAudioUpload && (
                <AudioTrimModal
                    key={pendingAudioUpload.audio.id}
                    isOpen={autoTrimModalOpen}
                    audioName={pendingAudioUpload.audio.name}
                    audioUrl={pendingAudioUpload.audio.url}
                    audioDuration={pendingAudioUpload.audio.duration}
                    initialTrimStart={0}
                    initialTrimEnd={Math.min(pendingAudioUpload.audio.duration, videoDuration)}
                    onConfirm={(trimStart, trimEnd) => {
                        if (pendingAudioUpload) {
                            const lastTrackEnd = audioTracks.reduce((max, track) =>
                                Math.max(max, track.startTime + track.duration), 0);

                            const newTrack: AudioTrack = {
                                id: pendingAudioUpload.trackId,
                                audioId: pendingAudioUpload.audio.id,
                                name: pendingAudioUpload.audio.name,
                                startTime: lastTrackEnd,
                                duration: trimEnd - trimStart,
                                trimStart: trimStart,
                                volume: 1,
                                loop: false,
                            };

                            setAudioTracks(prev => [...prev, newTrack]);

                            if (audioTracks.length === 0) {
                                setMuteOriginalAudio(true);
                            }
                        }
                        setAutoTrimModalOpen(false);
                        setPendingAudioUpload(null);
                    }}
                    onCancel={() => {
                        if (pendingAudioUpload) {
                            setUploadedAudios(prev => prev.filter(a => a.id !== pendingAudioUpload.audio.id));
                            URL.revokeObjectURL(pendingAudioUpload.audio.url);
                        }
                        setAutoTrimModalOpen(false);
                        setPendingAudioUpload(null);
                    }}
                />
            )}
        </div>
    );
}
