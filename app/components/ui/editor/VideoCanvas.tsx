"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef, useMemo, useState, useCallback } from "react";
import type { VideoCanvasHandle, VideoCanvasProps, VideoThumbnail } from "@/types";
import type { ImageElement, SvgElement } from "@/types/canvas-elements.types";
import { getCameraLayout } from "@/types/camera.types";
import { ASPECT_RATIO_DIMENSIONS } from "@/types";
import { getWallpaperUrl } from "@/lib/wallpaper.utils";
import { drawRoundedRect, drawRoundedRectBottomOnly, calculateScaledPadding, applyCanvasBackground, getAspectRatioStyle, getMaxWidth, Corner, getCornerStyle, getNearestCorner } from "@/lib/canvas.utils";
import { drawMockupToCanvas } from "@/lib/mockup-canvas.utils";
import { speedToTransitionMs, ZOOM_EASING, calculateZoomPhaseState, zoomLevelToFactor } from "@/types/zoom.types";
import type { ZoomFragment } from "@/types/zoom.types";
import PlaceholderEditor from "../PlaceholderEditor";
import { MockupWrapper } from "./mockups/MockupWrapper";
import { DEFAULT_MOCKUP_CONFIG } from "@/types/mockup.types";
import { calculateSmoothZoom } from "@/lib/canvas.utils";
import { getSvgDataUrl } from "@/components/canvas-svg";
import { VIDEO_Z_INDEX, BOTTOM_ONLY_RADIUS_MOCKUPS, SELF_SHADOWING_MOCKUPS } from "@/lib/constants";
import { applyPerspective3D, disposePerspective3D } from "@/lib/perspective3d";
import { RotationHandleIcon } from "@/components/ui/RotationHandleIcon";
import { CanvasElementsLayer } from "./CanvasElementsLayer";
import { EditorHoverTooltip } from "./EditorHoverTooltip";
import DropImage from "@/components/ui/DropImage";
import { LayersPanel } from "./LayersPanel";
import { Icon } from "@iconify/react";
import type { CursorConfig, CursorRecordingData, CursorKeyframe } from "@/types/cursor.types";
import { DEFAULT_CURSOR_CONFIG, interpolateCursorPosition } from "@/types/cursor.types";
import type { SpotlightFragment } from "@/types/spotlight.types";

export type { VideoCanvasHandle, VideoCanvasProps };

type ExtendedVideoCanvasProps = VideoCanvasProps & {
    cursorConfig?: CursorConfig;
    cursorData?: CursorRecordingData;
    isRecordedVideo?: boolean;
    spotlightFragments?: SpotlightFragment[];
    selectedSpotlightFragmentId?: string | null;
    onSelectSpotlightFragment?: (fragmentId: string | null) => void;
    onUpdateSpotlightFragment?: (fragmentId: string, updates: Partial<SpotlightFragment>) => void;
};

type ExtendedCursorConfig = CursorConfig & {
    spotlightEnabled?: boolean;
    spotlightSize?: number;
    spotlightOpacity?: number;
    spotlightBlur?: number;
    spotlightColor?: string;
};

function getSafeCursorFrame(
    cursorData: CursorRecordingData | undefined,
    time: number,
    smoothing: number
): CursorKeyframe | null {
    if (cursorData?.hasCursorData && cursorData.keyframes.length > 0) {
        return interpolateCursorPosition(cursorData.keyframes, time, smoothing);
    }

    return {
        time,
        x: 50 + Math.sin(time * 1.4) * 18,
        y: 50 + Math.cos(time * 0.9) * 12,
        state: "default",
        clicking: Math.floor(time * 2) % 9 === 0,
    };
}

function CursorSvgPreview({
    style,
    color,
    size,
}: {
    style: CursorConfig["style"];
    color: string;
    size: number;
}) {
    if (style === "none") return null;

    if (style === "dot") {
        return (
            <div
                className="rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-2 ring-white/60"
                style={{
                    width: size,
                    height: size,
                    backgroundColor: color,
                }}
            />
        );
    }

    if (style === "windows") {
        return (
            <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.35))" }}>
                <path
                    d="M6 3L25 18.5L16.6 20.2L12.4 29L6 3Z"
                    fill={color}
                    stroke={color.toLowerCase() === "#ffffff" ? "#111827" : "#ffffff"}
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.35))" }}>
            <path
                d="M6 3L25.5 17.2L17 18.9L12.5 28.5L6 3Z"
                fill={color}
                stroke={color.toLowerCase() === "#ffffff" ? "#111827" : "#ffffff"}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path
                d="M16.8 18.8L12.8 27.3"
                stroke={color.toLowerCase() === "#ffffff" ? "#111827" : "#ffffff"}
                strokeWidth="1.1"
                strokeLinecap="round"
            />
        </svg>
    );
}

export const VideoCanvas = forwardRef<VideoCanvasHandle, ExtendedVideoCanvasProps>(function VideoCanvas(props, ref) {
    const {
        mediaType = "video",
        imageUrl = null,
        imageRef,
        imageTransform,
        apply3DToBackground = false,
        imageMaskConfig,
        videoRef,
        videoUrl,
        padding,
        roundedCorners,
        shadows,
        aspectRatio = "auto",
        customAspectRatio,
        cropArea,
        backgroundTab = "wallpaper",
        selectedWallpaper = -1,
        backgroundBlur = 0,
        selectedImageUrl = "",
        unsplashOverrideUrl = "",
        backgroundColorCss,
        onTimeUpdate,
        onLoadedMetadata,
        onEnded,
        isScrubbing = false,
        scrubTime = 0,
        getThumbnailForTime,
        zoomFragments = [],
        currentTime = 0,
        mockupId = "none",
        mockupConfig,
        onVideoUpload,
        onImageUpload,
        onImageDrop,
        isUploading = false,
        videoTransform = { rotation: 0, translateX: 0, translateY: 0 },
        onVideoTransformChange,
        canvasElements = [],
        selectedElementId = null,
        onElementUpdate,
        onElementSelect,
        onElementDelete,
        cameraUrl = null,
        cameraConfig = null,
        onCameraConfigChange,
        onCameraClick,
        videoMaskConfig,
        layersPanelToolbar,
        textToolActive = false,
        onTextToolDeactivate,
        onAddElement,
        onSelectSpotlightFragment,
        onUpdateSpotlightFragment,
    } = props;

    const {
        cursorConfig = DEFAULT_CURSOR_CONFIG,
        cursorData,
    } = props;

    const extendedCursorConfig = cursorConfig as ExtendedCursorConfig;
    const spotlightFragments = props.spotlightFragments ?? [];

    const wallpaperUrl = getWallpaperUrl(selectedWallpaper);
    const hasMedia = mediaType === "video" ? !!videoUrl : !!imageUrl;

    const currentThumbnail = useMemo<VideoThumbnail | null>(() => {
        if (!isScrubbing || !getThumbnailForTime) return null;
        return getThumbnailForTime(scrubTime);
    }, [isScrubbing, scrubTime, getThumbnailForTime]);

    const activeZoomFragment = useMemo<ZoomFragment | null>(() => {
        if (!zoomFragments.length) return null;
        return zoomFragments.find(f => currentTime >= f.startTime && currentTime <= f.endTime) || null;
    }, [zoomFragments, currentTime]);

    const zoomTransform = useMemo(() => {
        if (!activeZoomFragment) {
            const lastFragment = zoomFragments
                .filter(f => f.endTime < currentTime)
                .sort((a, b) => b.endTime - a.endTime)[0];

            const exitMs = lastFragment ? speedToTransitionMs(lastFragment.speed) : speedToTransitionMs(3);

            return {
                scale: 1,
                translateX: 0,
                translateY: 0,
                transitionMs: exitMs,
                rotateX: 0,
                rotateY: 0,
                perspective: lastFragment?.enable3D ? 600 : 0,
                isMoving: false,
            };
        }

        const phaseState = calculateZoomPhaseState(activeZoomFragment, currentTime);
        const translateX = 50 - phaseState.focusX;
        const translateY = 50 - phaseState.focusY;
        const isMoving = activeZoomFragment.movementEnabled && phaseState.phase === "hold";
        const transitionMs = isMoving ? 50 : speedToTransitionMs(activeZoomFragment.speed);

        return {
            scale: phaseState.scale,
            translateX,
            translateY,
            transitionMs,
            rotateX: phaseState.rotateX,
            rotateY: phaseState.rotateY,
            perspective: phaseState.perspective,
            isMoving,
        };
    }, [activeZoomFragment, zoomFragments, currentTime]);

    const cursorFrame = useMemo(() => {
        if (mediaType !== "video") return null;
        if (!hasMedia) return null;
        if (!cursorConfig.visible || cursorConfig.style === "none") return null;

        return getSafeCursorFrame(cursorData, currentTime, cursorConfig.smoothing);
    }, [mediaType, hasMedia, cursorConfig.visible, cursorConfig.style, cursorConfig.smoothing, cursorData, currentTime]);

    const shouldShowCursorOverlay =
        mediaType === "video" &&
        hasMedia &&
        cursorConfig.visible &&
        cursorConfig.style !== "none" &&
        !!cursorFrame;

    const shouldShowSpotlight =
        shouldShowCursorOverlay &&
        extendedCursorConfig.spotlightEnabled === true;

    const activeSpotlightFragment = useMemo(() => {
        if (mediaType !== "video" || !hasMedia || spotlightFragments.length === 0) return null;

        return spotlightFragments.find((fragment) => currentTime >= fragment.startTime && currentTime <= fragment.endTime) ?? null;
    }, [mediaType, hasMedia, spotlightFragments, currentTime]);

    const shouldShowUnsplashOverride = backgroundTab === "wallpaper" && unsplashOverrideUrl !== "";
    const shouldShowWallpaper = backgroundTab === "wallpaper" && selectedWallpaper >= 0 && !shouldShowUnsplashOverride;
    const shouldShowCustomImage = backgroundTab === "image" && selectedImageUrl !== "";
    const shouldShowCustomColor = backgroundTab === "color" && !!backgroundColorCss;

    const exportCanvasRef = useRef<HTMLCanvasElement>(null);
    const foregroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const wallpaperImageRef = useRef<HTMLImageElement | null>(null);
    const customImageRef = useRef<HTMLImageElement | null>(null);

    const exportDimensions = useMemo(() => {
        if ((aspectRatio === "auto" || aspectRatio === "custom") && customAspectRatio) {
            return { width: customAspectRatio.width, height: customAspectRatio.height };
        }

        const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];
        return dims || { width: 1920, height: 1080 };
    }, [aspectRatio, customAspectRatio]);

    const [isVideoHovered, setIsVideoHovered] = useState(false);
    const [isVideoSelected, setIsVideoSelected] = useState(false);
    const [imageZoomScale, setImageZoomScale] = useState(1);

    const lastSetVideoUrlRef = useRef<string | null>(null);
    const preservedVideoStateRef = useRef<{ time: number; playing: boolean } | null>(null);

    useEffect(() => {
        lastSetVideoUrlRef.current = null;
    }, [mockupId]);

    useEffect(() => {
        if (videoRef.current && videoUrl) {
            const videoSrc = videoRef.current.src;
            const needsSrc = !videoSrc || videoSrc === "" || videoSrc === window.location.href;
            const isNewUrl = videoUrl !== lastSetVideoUrlRef.current;

            if (needsSrc || isNewUrl) {
                videoRef.current.src = videoUrl;
                lastSetVideoUrlRef.current = videoUrl;

                if (preservedVideoStateRef.current) {
                    const { time, playing } = preservedVideoStateRef.current;
                    videoRef.current.currentTime = time;

                    if (playing) {
                        videoRef.current.play().catch(() => {});
                    }

                    preservedVideoStateRef.current = null;
                }
            }
        }

        if (!videoUrl) {
            lastSetVideoUrlRef.current = null;
        }
    }, [videoUrl, videoRef, mockupId]);

    useEffect(() => {
        return () => {
            if (videoRef.current && videoUrl) {
                preservedVideoStateRef.current = {
                    time: videoRef.current.currentTime,
                    playing: !videoRef.current.paused,
                };
            }
        };
    }, [mockupId, videoUrl, videoRef]);

    useEffect(() => {
        return () => {
            disposePerspective3D();
        };
    }, []);

    const [isDraggingVideo, setIsDraggingVideo] = useState(false);
    const [isDraggingRotation, setIsDraggingRotation] = useState(false);
    const [videoHoverCorner, setVideoHoverCorner] = useState<Corner | null>("top-right");

    const dragStartPos = useRef({
        x: 0,
        y: 0,
        initialRotation: 0,
        initialTranslateX: 0,
        initialTranslateY: 0,
    });

    const lastAngleRef = useRef<number | null>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const [elementCorners, setElementCorners] = useState<Record<string, Corner | null>>({});

    const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    const [isDraggingSpotlight, setIsDraggingSpotlight] = useState(false);
    const spotlightDragRef = useRef<{
        pointerId: number;
        fragmentId: string;
        mode: "move" | "resize";
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        initialWidth: number;
        initialHeight: number;
    } | null>(null);

    const cameraDragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        rect: DOMRect;
    } | null>(null);

    const [isDraggingCamera, setIsDraggingCamera] = useState(false);

    const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
    const [isDraggingElement, setIsDraggingElement] = useState(false);
    const [isDraggingElementRotation, setIsDraggingElementRotation] = useState(false);

    const elementDragStart = useRef({
        x: 0,
        y: 0,
        initialX: 0,
        initialY: 0,
        initialRotation: 0,
    });

    const multiDragStartRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const pendingCollapseRef = useRef<string | null>(null);
    const wasDragRef = useRef(false);

    const [alignmentGuides, setAlignmentGuides] = useState<{
        vertical: number[];
        horizontal: number[];
    }>({ vertical: [], horizontal: [] });

    const [mockupAlignmentGuides, setMockupAlignmentGuides] = useState<{
        vertical: number[];
        horizontal: number[];
    }>({ vertical: [], horizontal: [] });

    const handleElementSelect = (id: string | null) => {
        if (id !== null) {
            setIsVideoSelected(false);
        }

        if (onElementSelect) {
            onElementSelect(id);
        }
    };

    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [canvasSelectedIds, setCanvasSelectedIds] = useState<string[]>([]);
    const [canvasCtxMenu, setCanvasCtxMenu] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (!canvasCtxMenu) return;

        const close = (e: PointerEvent) => {
            if ((e.target as HTMLElement).closest("[data-canvas-ctx-menu]")) return;
            setCanvasCtxMenu(null);
        };

        window.addEventListener("pointerdown", close);
        return () => window.removeEventListener("pointerdown", close);
    }, [!!canvasCtxMenu]);

    useEffect(() => {
        if (!isDraggingSpotlight) return;

        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

        const handlePointerMove = (event: PointerEvent) => {
            const drag = spotlightDragRef.current;
            const container = previewContainerRef.current;

            if (!drag || !container || event.pointerId !== drag.pointerId || !onUpdateSpotlightFragment) return;

            const rect = container.getBoundingClientRect();
            const dx = ((event.clientX - drag.startX) / Math.max(1, rect.width)) * 100;
            const dy = ((event.clientY - drag.startY) / Math.max(1, rect.height)) * 100;

            if (drag.mode === "move") {
                onUpdateSpotlightFragment(drag.fragmentId, {
                    x: clamp(drag.initialX + dx, 0, 100),
                    y: clamp(drag.initialY + dy, 0, 100),
                });
                return;
            }

            onUpdateSpotlightFragment(drag.fragmentId, {
                width: clamp(drag.initialWidth + dx * 2, 4, 100),
                height: clamp(drag.initialHeight + dy * 2, 4, 100),
            });
        };

        const handlePointerUp = (event: PointerEvent) => {
            const drag = spotlightDragRef.current;

            if (drag && event.pointerId !== drag.pointerId) return;

            spotlightDragRef.current = null;
            setIsDraggingSpotlight(false);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [isDraggingSpotlight, onUpdateSpotlightFragment]);

    const handleSpotlightPointerDown = useCallback((
        event: React.PointerEvent<HTMLDivElement>,
        fragment: SpotlightFragment,
        mode: "move" | "resize"
    ) => {
        if (!onUpdateSpotlightFragment) return;

        event.preventDefault();
        event.stopPropagation();

        onSelectSpotlightFragment?.(fragment.id);
        setIsVideoSelected(false);
        onElementSelect?.(null);

        event.currentTarget.setPointerCapture?.(event.pointerId);

        spotlightDragRef.current = {
            pointerId: event.pointerId,
            fragmentId: fragment.id,
            mode,
            startX: event.clientX,
            startY: event.clientY,
            initialX: fragment.x,
            initialY: fragment.y,
            initialWidth: fragment.width,
            initialHeight: fragment.height,
        };

        setIsDraggingSpotlight(true);
    }, [onElementSelect, onSelectSpotlightFragment, onUpdateSpotlightFragment]);

    const maskStyles = useMemo(() => {
        const config = mediaType === "video" ? videoMaskConfig : imageMaskConfig;
        if (!config || !config.enabled) return {};

        const masks = [];

        if (config.top) {
            masks.push(`linear-gradient(180deg, transparent ${config.top.from}%, black ${config.top.to ?? 100}%)`);
        }

        if (config.bottom) {
            masks.push(`linear-gradient(0deg, transparent ${config.bottom.from}%, black ${config.bottom.to ?? 100}%)`);
        }

        if (config.left) {
            masks.push(`linear-gradient(90deg, transparent ${config.left.from}%, black ${config.left.to ?? 100}%)`);
        }

        if (config.right) {
            masks.push(`linear-gradient(270deg, transparent ${config.right.from}%, black ${config.right.to ?? 100}%)`);
        }

        if (config.angle !== undefined) {
            masks.push(`linear-gradient(${config.angle}deg, transparent ${config.angleFrom ?? 0}%, black ${config.angleTo ?? 100}%)`);
        }

        if (masks.length === 0) return {};

        return {
            WebkitMaskImage: masks.join(", "),
            WebkitMaskComposite: "source-in",
            maskImage: masks.join(", "),
            maskComposite: "intersect",
        };
    }, [mediaType, videoMaskConfig, imageMaskConfig]);

    const hasMask = Object.keys(maskStyles).length > 0;
    const hasMockup = mockupId && mockupId !== "none";

    const elementImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const svgImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

    useEffect(() => {
        const canvas = exportCanvasRef.current;

        if (canvas) {
            canvas.width = exportDimensions.width;
            canvas.height = exportDimensions.height;
        }
    }, [exportDimensions]);

    useEffect(() => {
        if (shouldShowWallpaper && wallpaperUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = wallpaperUrl;
            img.onload = () => {
                wallpaperImageRef.current = img;
            };
        } else {
            wallpaperImageRef.current = null;
        }
    }, [shouldShowWallpaper, wallpaperUrl]);

    const imageUrlToLoad = shouldShowCustomImage ? selectedImageUrl : shouldShowUnsplashOverride ? unsplashOverrideUrl : null;

    useEffect(() => {
        if (imageUrlToLoad) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrlToLoad;
            img.onload = () => {
                customImageRef.current = img;
            };
        } else {
            customImageRef.current = null;
        }
    }, [imageUrlToLoad]);

    useEffect(() => {
        const cache = elementImagesRef.current;
        const loadedPaths = new Set(cache.keys());
        const currentPaths = new Set(
            canvasElements
                .filter((el): el is ImageElement => el.type === "image")
                .map(el => el.imagePath)
        );

        for (const path of loadedPaths) {
            if (!currentPaths.has(path)) {
                cache.delete(path);
            }
        }

        for (const element of canvasElements) {
            if (element.type === "image") {
                const imageElement = element as ImageElement;

                if (!cache.has(imageElement.imagePath)) {
                    const img = new Image();
                    img.crossOrigin = "anonymous";

                    img.onload = () => {
                        cache.set(imageElement.imagePath, img);
                    };

                    img.onerror = () => {
                        console.error(`Failed to load canvas element image: ${imageElement.imagePath}`);
                    };

                    img.src = imageElement.imagePath;
                }
            }
        }
    }, [canvasElements]);

    useEffect(() => {
        if (!isDraggingVideo && !isDraggingRotation) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!onVideoTransformChange) return;

            if (isDraggingRotation) {
                const container = videoContainerRef.current;
                if (!container) return;

                const rect = container.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const rawAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;

                if (lastAngleRef.current === null) {
                    lastAngleRef.current = rawAngle;
                }

                let delta = rawAngle - lastAngleRef.current;

                if (delta > 180) delta -= 360;
                if (delta < -180) delta += 360;

                lastAngleRef.current = rawAngle;

                onVideoTransformChange({
                    ...videoTransform,
                    rotation: videoTransform.rotation + delta,
                });
            } else if (isDraggingVideo) {
                const deltaX = e.clientX - dragStartPos.current.x;
                const deltaY = e.clientY - dragStartPos.current.y;
                const container = videoContainerRef.current;

                if (!container) return;

                const rect = container.getBoundingClientRect();
                const percentX = (deltaX / rect.width) * 100;
                const percentY = (deltaY / rect.height) * 100;

                let newTranslateX = dragStartPos.current.initialTranslateX + percentX;
                let newTranslateY = dragStartPos.current.initialTranslateY + percentY;

                const SNAP_THRESHOLD = 2;
                const centerX = 0;
                const centerY = 0;
                const guides: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };

                if (Math.abs(newTranslateX - centerX) < SNAP_THRESHOLD) {
                    newTranslateX = centerX;
                    guides.vertical.push(50);
                }

                if (Math.abs(newTranslateY - centerY) < SNAP_THRESHOLD) {
                    newTranslateY = centerY;
                    guides.horizontal.push(50);
                }

                setMockupAlignmentGuides(guides);

                onVideoTransformChange({
                    ...videoTransform,
                    translateX: newTranslateX,
                    translateY: newTranslateY,
                });
            }
        };

        const handleMouseUp = () => {
            setIsDraggingVideo(false);
            setIsDraggingRotation(false);
            setMockupAlignmentGuides({ vertical: [], horizontal: [] });
            lastAngleRef.current = null;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingVideo, isDraggingRotation, videoTransform, onVideoTransformChange]);

    useEffect(() => {
        const el = cameraVideoRef.current;

        if (!el) return;

        if (!cameraUrl) {
            if (el.src) {
                el.pause();
                el.removeAttribute("src");
                el.load();
            }

            return;
        }

        if (el.src !== cameraUrl) {
            el.src = cameraUrl;
            el.load();
        }
    }, [cameraUrl]);

    useEffect(() => {
        const mainVideo = videoRef.current;
        const camVideo = cameraVideoRef.current;

        if (!mainVideo || !camVideo || !cameraUrl) return;

        const syncTime = () => {
            if (!camVideo.seeking && Math.abs(camVideo.currentTime - mainVideo.currentTime) > 0.15) {
                try {
                    camVideo.currentTime = mainVideo.currentTime;
                } catch {}
            }
        };

        const syncPlay = () => {
            camVideo.play().catch(() => undefined);
        };

        const syncPause = () => {
            if (!camVideo.paused) camVideo.pause();
        };

        mainVideo.addEventListener("play", syncPlay);
        mainVideo.addEventListener("pause", syncPause);
        mainVideo.addEventListener("seeked", syncTime);
        mainVideo.addEventListener("timeupdate", syncTime);

        return () => {
            mainVideo.removeEventListener("play", syncPlay);
            mainVideo.removeEventListener("pause", syncPause);
            mainVideo.removeEventListener("seeked", syncTime);
            mainVideo.removeEventListener("timeupdate", syncTime);
        };
    }, [videoRef, cameraUrl]);

    useEffect(() => {
        if (!isDraggingElement) return;

        const snapshot = new Map<string, { x: number; y: number }>();

        canvasSelectedIds.forEach((id) => {
            const el = canvasElements.find((e) => e.id === id);
            if (el) snapshot.set(id, { x: el.x, y: el.y });
        });

        multiDragStartRef.current = snapshot;
    }, [isDraggingElement]);

    useEffect(() => {
        if (!isDraggingElement && !isDraggingElementRotation) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!selectedElementId || !onElementUpdate) return;

            const selectedElement = canvasElements.find(el => el.id === selectedElementId);
            if (!selectedElement) return;

            if (isDraggingElementRotation) {
                const container = canvasContainerRef.current;
                if (!container) return;

                const rect = container.getBoundingClientRect();
                const centerX = rect.left + rect.width * (selectedElement.x / 100);
                const centerY = rect.top + rect.height * (selectedElement.y / 100);

                const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

                const startAngle = Math.atan2(
                    elementDragStart.current.y - centerY,
                    elementDragStart.current.x - centerX
                ) * (180 / Math.PI);

                let deltaAngle = currentAngle - startAngle;

                if (deltaAngle > 180) deltaAngle -= 360;
                if (deltaAngle < -180) deltaAngle += 360;

                onElementUpdate(selectedElementId, {
                    rotation: elementDragStart.current.initialRotation + deltaAngle,
                });
            } else if (isDraggingElement) {
                const container = canvasContainerRef.current;
                if (!container) return;

                const rect = container.getBoundingClientRect();
                const deltaX = e.clientX - elementDragStart.current.x;
                const deltaY = e.clientY - elementDragStart.current.y;

                if (!wasDragRef.current && Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;

                wasDragRef.current = true;
                pendingCollapseRef.current = null;

                const percentX = (deltaX / rect.width) * 100;
                const percentY = (deltaY / rect.height) * 100;

                if (canvasSelectedIds.length > 1) {
                    multiDragStartRef.current.forEach((startPos, id) => {
                        const el = canvasElements.find(e => e.id === id);
                        if (!el || el.locked) return;

                        const newX = Math.max(0, Math.min(100, startPos.x + percentX));
                        const newY = Math.max(0, Math.min(100, startPos.y + percentY));

                        onElementUpdate(id, { x: newX, y: newY });
                    });
                } else {
                    let newX = Math.max(0, Math.min(100, elementDragStart.current.initialX + percentX));
                    let newY = Math.max(0, Math.min(100, elementDragStart.current.initialY + percentY));

                    const SNAP_THRESHOLD = 2;
                    const centerX = 50;
                    const centerY = 50;
                    const guides: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };

                    if (Math.abs(newX - centerX) < SNAP_THRESHOLD) {
                        newX = centerX;
                        guides.vertical.push(centerX);
                    }

                    if (Math.abs(newY - centerY) < SNAP_THRESHOLD) {
                        newY = centerY;
                        guides.horizontal.push(centerY);
                    }

                    setAlignmentGuides(guides);

                    onElementUpdate(selectedElementId, {
                        x: newX,
                        y: newY,
                    });
                }
            }
        };

        const handleMouseUp = () => {
            if (pendingCollapseRef.current && !wasDragRef.current) {
                const id = pendingCollapseRef.current;
                setCanvasSelectedIds([id]);
            }

            pendingCollapseRef.current = null;
            wasDragRef.current = false;
            setIsDraggingElement(false);
            setIsDraggingElementRotation(false);
            setAlignmentGuides({ vertical: [], horizontal: [] });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingElement, isDraggingElementRotation, selectedElementId, canvasElements, canvasSelectedIds, onElementUpdate]);

    useEffect(() => {
        if (mediaType !== "image" || !imageUrl) return;

        const handleWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;

            e.preventDefault();

            const delta = -e.deltaY;
            const zoomFactor = delta > 0 ? 1.1 : 0.9;

            setImageZoomScale(prev => {
                const newScale = Math.max(0.5, Math.min(3, prev * zoomFactor));
                return newScale;
            });
        };

        const container = previewContainerRef.current;
        if (!container) return;

        container.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, [mediaType, imageUrl]);

    const handleDragOver = (e: React.DragEvent) => {
        if (mediaType !== "image" || !onImageDrop) return;
        if (!e.dataTransfer.types.includes("Files")) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (mediaType !== "image") return;

        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (mediaType !== "image" || !onImageDrop) return;
        if (!e.dataTransfer.types.includes("Files")) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const files = e.dataTransfer.files;

        if (files && files.length > 0) {
            onImageDrop(files);
        }
    };

    const renderCanvasElements = async (
        ctx: CanvasRenderingContext2D,
        elements: typeof canvasElements,
        canvasWidth: number,
        canvasHeight: number,
        behindVideo: boolean
    ) => {
        const filteredElements = elements.filter(el =>
            behindVideo ? el.zIndex < VIDEO_Z_INDEX : el.zIndex >= VIDEO_Z_INDEX
        );

        const sortedElements = [...filteredElements].sort((a, b) => a.zIndex - b.zIndex);
        const referenceSize = Math.min(canvasWidth, canvasHeight);

        for (const element of sortedElements) {
            if (element.type === "svg") {
                const svgElement = element as SvgElement;
                const svgDataUrl = getSvgDataUrl(svgElement.svgId, svgElement.color || "#FFFFFF");

                if (!svgDataUrl) continue;

                const cacheKey = `${svgElement.svgId}-${svgElement.color || "#FFFFFF"}`;
                let svgImage = svgImageCacheRef.current.get(cacheKey);

                if (!svgImage || svgImage.src !== svgDataUrl) {
                    svgImage = new Image();
                    svgImageCacheRef.current.set(cacheKey, svgImage);
                    svgImage.src = svgDataUrl;

                    await new Promise<void>((resolve) => {
                        if (svgImage!.complete) resolve();
                        else {
                            svgImage!.onload = () => resolve();
                            svgImage!.onerror = () => resolve();
                        }
                    });
                } else if (!svgImage.complete) {
                    await new Promise<void>((resolve) => {
                        svgImage!.onload = () => resolve();
                        svgImage!.onerror = () => resolve();
                        setTimeout(resolve, 500);
                    });
                }

                ctx.save();

                const elemX = (svgElement.x / 100) * canvasWidth;
                const elemY = (svgElement.y / 100) * canvasHeight;
                const elemWidth = (svgElement.width / 100) * referenceSize;
                const elemHeight = (svgElement.height / 100) * referenceSize;

                ctx.translate(elemX, elemY);
                ctx.rotate((svgElement.rotation * Math.PI) / 180);
                ctx.globalAlpha = svgElement.opacity;

                ctx.drawImage(
                    svgImage,
                    -elemWidth / 2,
                    -elemHeight / 2,
                    elemWidth,
                    elemHeight
                );

                ctx.restore();
            } else if (element.type === "image") {
                const img = elementImagesRef.current.get(element.imagePath);
                if (!img) continue;

                ctx.save();

                const elemX = (element.x / 100) * canvasWidth;
                const elemY = (element.y / 100) * canvasHeight;
                const elemWidth = (element.width / 100) * referenceSize;
                const elemHeight = (element.height / 100) * referenceSize;
                const imgAspectRatio = img.naturalWidth / img.naturalHeight;

                let finalWidth = elemWidth;
                let finalHeight = elemHeight;

                const elementAspectRatio = elemWidth / elemHeight;

                if (imgAspectRatio > elementAspectRatio) {
                    finalHeight = elemWidth / imgAspectRatio;
                } else {
                    finalWidth = elemHeight * imgAspectRatio;
                }

                ctx.translate(elemX, elemY);
                ctx.rotate((element.rotation * Math.PI) / 180);
                ctx.globalAlpha = element.opacity;

                ctx.drawImage(
                    img,
                    -finalWidth / 2,
                    -finalHeight / 2,
                    finalWidth,
                    finalHeight
                );

                ctx.restore();
            } else if (element.type === "text") {
                ctx.save();

                const elemX = (element.x / 100) * canvasWidth;
                const elemY = (element.y / 100) * canvasHeight;

                ctx.translate(elemX, elemY);
                ctx.rotate((element.rotation * Math.PI) / 180);
                ctx.globalAlpha = element.opacity;

                const scaledFontSize = element.fontSize * (referenceSize / 1080);
                const fontWeight = element.fontWeight === "normal" ? "400" : element.fontWeight === "medium" ? "500" : "700";

                ctx.font = `${fontWeight} ${scaledFontSize}px ${element.fontFamily}`;
                ctx.fillStyle = element.color;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                ctx.fillText(element.content, 0, 0);

                ctx.restore();
            }
        }
    };


    const drawSpotlightToCanvas = (
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number
    ) => {
        if (!activeSpotlightFragment) return;

        const fragment = activeSpotlightFragment;
        const x = (fragment.x / 100) * canvasWidth;
        const y = (fragment.y / 100) * canvasHeight;
        const width = (fragment.width / 100) * canvasWidth;
        const height = (fragment.height / 100) * canvasHeight;
        const left = x - width / 2;
        const top = y - height / 2;
        const intensity = Math.max(0, Math.min(0.9, fragment.intensity ?? 0.72));
        const radius = Math.max(0, fragment.radius ?? 18) * (canvasWidth / 1920);

        ctx.save();

        ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.globalCompositeOperation = "destination-out";

        if (fragment.shape === "circle") {
            ctx.beginPath();
            ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
            ctx.fillStyle = "black";
            ctx.fill();
        } else {
            ctx.beginPath();

            if (fragment.shape === "rounded") {
                drawRoundedRect(ctx, left, top, width, height, radius);
            } else {
                ctx.rect(left, top, width, height);
            }

            ctx.fillStyle = "black";
            ctx.fill();
        }

        ctx.globalCompositeOperation = "source-over";

        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(width, height) * 0.72);
        glowGradient.addColorStop(0, "rgba(255,255,255,0.18)");
        glowGradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glowGradient;
        ctx.fillRect(left - width * 0.35, top - height * 0.35, width * 1.7, height * 1.7);

        ctx.restore();
    };

    const drawCursorToCanvas = (
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number,
        frameTime: number
    ) => {
        if (mediaType !== "video") return;
        if (!cursorConfig.visible || cursorConfig.style === "none") return;

        const frame = getSafeCursorFrame(cursorData, frameTime, cursorConfig.smoothing);
        if (!frame) return;

        const x = (frame.x / 100) * canvasWidth;
        const y = (frame.y / 100) * canvasHeight;
        const size = Math.max(12, cursorConfig.size);
        const color = cursorConfig.color || "#FFFFFF";

        if (extendedCursorConfig.spotlightEnabled) {
            const spotlightSize = extendedCursorConfig.spotlightSize ?? 240;
            const spotlightOpacity = extendedCursorConfig.spotlightOpacity ?? 0.55;

            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${spotlightOpacity})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, spotlightSize);
            gradient.addColorStop(0, "rgba(0,0,0,1)");
            gradient.addColorStop(0.55, "rgba(0,0,0,0.65)");
            gradient.addColorStop(1, "rgba(0,0,0,0)");

            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, spotlightSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (cursorConfig.clickEffect !== "none" && frame.clicking) {
            ctx.save();
            ctx.strokeStyle = cursorConfig.clickEffectColor;
            ctx.globalAlpha = 0.75;
            ctx.lineWidth = Math.max(3, size * 0.08);
            ctx.beginPath();
            ctx.arc(x, y, size * 0.75, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(x, y);

        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = size * 0.3;
        ctx.shadowOffsetY = size * 0.12;

        if (cursorConfig.style === "dot") {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = Math.max(2, size * 0.08);
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size * 0.62, size * 0.48);
            ctx.lineTo(size * 0.36, size * 0.55);
            ctx.lineTo(size * 0.2, size * 0.92);
            ctx.lineTo(size * 0.08, size * 0.86);
            ctx.lineTo(size * 0.24, size * 0.52);
            ctx.lineTo(0, 0);
            ctx.closePath();

            ctx.fillStyle = color;
            ctx.fill();

            ctx.lineWidth = Math.max(1.5, size * 0.045);
            ctx.strokeStyle = color.toLowerCase() === "#ffffff" ? "#111827" : "#ffffff";
            ctx.stroke();
        }

        ctx.restore();
    };

    const drawFrame = async () => {
        const canvas = exportCanvasRef.current;

        const canvasCtxOptions: CanvasRenderingContext2DSettings = {
            alpha: true,
            colorSpace: "srgb",
            desynchronized: false,
            willReadFrequently: false,
        };

        const ctx = canvas?.getContext("2d", canvasCtxOptions);
        const video = videoRef.current;
        const image = imageRef?.current;
        const mediaSource = mediaType === "image" ? image : video;

        if (!canvas || !ctx || !mediaSource) return;

        const sourceWidth = mediaType === "image" ? image?.naturalWidth ?? 0 : video?.videoWidth ?? 0;
        const sourceHeight = mediaType === "image" ? image?.naturalHeight ?? 0 : video?.videoHeight ?? 0;

        if (sourceWidth === 0 || sourceHeight === 0) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const paddingPercent = padding * 0.5 / 100;

        const scaledPaddingX = calculateScaledPadding(canvasWidth, paddingPercent);
        const scaledPaddingY = calculateScaledPadding(canvasHeight, paddingPercent);
        const scaledRadius = roundedCorners * (canvasWidth / 896);
        const scaledShadowBlur = shadows * (canvasWidth / 896) * 0.8;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const frameTime = mediaType === "video" && video ? video.currentTime : 0;
        const zoomState = calculateSmoothZoom(frameTime, zoomFragments);
        const zoomCenterX = canvasWidth / 2;
        const zoomCenterY = canvasHeight / 2;

        const backgroundImage =
            shouldShowCustomImage || shouldShowUnsplashOverride
                ? customImageRef.current
                : shouldShowWallpaper
                    ? wallpaperImageRef.current
                    : null;

        const drawBg = (c: CanvasRenderingContext2D) => {
            if (shouldShowCustomColor && backgroundColorCss) {
                applyCanvasBackground(c, backgroundColorCss, canvasWidth, canvasHeight);
            } else if (backgroundImage) {
                c.save();

                if (backgroundBlur > 0) {
                    c.filter = `blur(${backgroundBlur * 0.8}px)`;
                    const overflow = backgroundBlur * 2;
                    c.drawImage(backgroundImage, -overflow, -overflow, canvasWidth + overflow * 2, canvasHeight + overflow * 2);
                } else {
                    c.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
                }

                c.restore();
            }
        };

        const computeContainer = () => {
            const availableWidth = canvasWidth - scaledPaddingX * 2;
            const availableHeight = canvasHeight - scaledPaddingY * 2;

            let mSrcW = sourceWidth;
            let mSrcH = sourceHeight;

            if (cropArea && (cropArea.width < 100 || cropArea.height < 100)) {
                mSrcW = (cropArea.width / 100) * sourceWidth;
                mSrcH = (cropArea.height / 100) * sourceHeight;
            }

            const mAR = mSrcW / mSrcH;
            const aAR = availableWidth / availableHeight;

            let cW: number;
            let cH: number;

            if (mAR > aAR) {
                cW = availableWidth;
                cH = availableWidth / mAR;
            } else {
                cH = availableHeight;
                cW = availableHeight * mAR;
            }

            const cX = scaledPaddingX + (availableWidth - cW) / 2;
            const cY = scaledPaddingY + (availableHeight - cH) / 2;

            return {
                containerX: cX,
                containerY: cY,
                containerWidth: cW,
                containerHeight: cH,
            };
        };

        const DEG_TO_RAD = Math.PI / 180;

        const drawMockupAndMedia = (
            c: CanvasRenderingContext2D,
            containerX: number,
            containerY: number,
            containerWidth: number,
            containerHeight: number,
            source: HTMLVideoElement | HTMLImageElement,
            applyImageXform: boolean
        ) => {
            const vCX = containerX + containerWidth / 2;
            const vCY = containerY + containerHeight / 2;
            const txPx = (videoTransform.translateX / 100) * containerWidth;
            const tyPx = (videoTransform.translateY / 100) * containerHeight;

            c.save();
            c.translate(vCX + txPx, vCY + tyPx);
            c.rotate(videoTransform.rotation * DEG_TO_RAD);

            if (applyImageXform && imageTransform && !apply3DToBackground) {
                if (imageTransform.perspective && imageTransform.perspective > 0 && (imageTransform.rotateX !== 0 || imageTransform.rotateY !== 0)) {
                    const rotXR = imageTransform.rotateX * DEG_TO_RAD;
                    const rotYR = imageTransform.rotateY * DEG_TO_RAD;
                    const tanY2 = Math.tan(rotYR);
                    const tanX2 = Math.tan(rotXR);
                    const sX2 = 1 / Math.sqrt(1 + tanY2 * tanY2);
                    const sY2 = 1 / Math.sqrt(1 + tanX2 * tanX2);

                    c.transform(sX2, tanX2 * sY2, tanY2 * sX2, sY2, 0, 0);
                }

                c.rotate(imageTransform.rotateZ * DEG_TO_RAD);
                c.scale(imageTransform.scale * imageZoomScale, imageTransform.scale * imageZoomScale);

                const iTY = (imageTransform.translateY / 100) * containerHeight;
                c.translate(0, iTY / (imageTransform.scale * imageZoomScale));
            }

            c.translate(-vCX, -vCY);

            if (shadows > 0 && !SELF_SHADOWING_MOCKUPS.includes(mockupId)) {
                c.save();
                c.shadowColor = "rgba(0, 0, 0, 0.5)";
                c.shadowBlur = scaledShadowBlur;
                c.shadowOffsetY = scaledShadowBlur * 0.3;
                c.fillStyle = "black";
                drawRoundedRect(c, containerX, containerY, containerWidth, containerHeight, scaledRadius);
                c.fill();
                c.restore();
            }

            const hasMockupLocal = mockupId && mockupId !== "none";
            const mockupCfg = mockupConfig || DEFAULT_MOCKUP_CONFIG;

            let vX = containerX;
            let vY = containerY;
            let vW = containerWidth;
            let vH = containerHeight;
            let vR = scaledRadius;

            if (hasMockupLocal) {
                const mBlur = SELF_SHADOWING_MOCKUPS.includes(mockupId) ? scaledShadowBlur : 0;

                const mr = drawMockupToCanvas(
                    c,
                    mockupId,
                    mockupCfg,
                    containerX,
                    containerY,
                    containerWidth,
                    containerHeight,
                    scaledRadius,
                    mBlur,
                    canvasWidth
                );

                vX = mr.contentX;
                vY = mr.contentY;
                vW = mr.contentWidth;
                vH = mr.contentHeight;
                vR = mockupId === "iphone-slim" || mockupId === "glass-curve" || mockupId === "glass-full" ? scaledRadius * 6 : scaledRadius;
            }

            c.save();

            const bottomOnly = hasMockupLocal && BOTTOM_ONLY_RADIUS_MOCKUPS.includes(mockupId);

            if (vR > 0) {
                if (bottomOnly) {
                    drawRoundedRectBottomOnly(c, vX, vY, vW, vH, vR);
                } else {
                    drawRoundedRect(c, vX, vY, vW, vH, vR);
                }

                c.clip();
            } else {
                c.beginPath();
                c.rect(vX, vY, vW, vH);
                c.clip();
            }

            if (mediaType === "video") {
                c.filter = "saturate(130%) contrast(104%) brightness(103%)";
            }

            if (cropArea && (cropArea.width < 100 || cropArea.height < 100 || cropArea.x > 0 || cropArea.y > 0)) {
                const sX = (cropArea.x / 100) * sourceWidth;
                const sY = (cropArea.y / 100) * sourceHeight;
                const cW2 = (cropArea.width / 100) * sourceWidth;
                const cH2 = (cropArea.height / 100) * sourceHeight;

                c.drawImage(source, sX, sY, cW2, cH2, vX, vY, vW, vH);
            } else {
                c.drawImage(source, vX, vY, vW, vH);
            }

            c.restore();
            c.restore();
        };

        if (mediaType === "image") {
            ctx.save();

            if (imageTransform && apply3DToBackground) {
                ctx.translate(zoomCenterX, zoomCenterY);

                if (imageTransform.perspective && imageTransform.perspective > 0 && (imageTransform.rotateX !== 0 || imageTransform.rotateY !== 0)) {
                    const rXR = (imageTransform.rotateX * Math.PI) / 180;
                    const rYR = (imageTransform.rotateY * Math.PI) / 180;
                    const tY2 = Math.tan(rYR);
                    const tX2 = Math.tan(rXR);
                    const sX2 = 1 / Math.sqrt(1 + tY2 * tY2);
                    const sY2 = 1 / Math.sqrt(1 + tX2 * tX2);

                    ctx.transform(sX2, tX2 * sY2, tY2 * sX2, sY2, 0, 0);
                }

                ctx.rotate((imageTransform.rotateZ * Math.PI) / 180);
                ctx.scale(imageTransform.scale * imageZoomScale, imageTransform.scale * imageZoomScale);

                const iTY = (imageTransform.translateY / 100) * canvasHeight;
                ctx.translate(-zoomCenterX, -zoomCenterY + iTY);
            }

            drawBg(ctx);
            await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, true);

            const {
                containerX: cX,
                containerY: cY,
                containerWidth: cW,
                containerHeight: cH,
            } = computeContainer();

            drawMockupAndMedia(ctx, cX, cY, cW, cH, image!, true);

            await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, false);

            ctx.restore();
            return;
        }

        const has3DEffect = zoomState.perspective > 0 && (zoomState.rotateX !== 0 || zoomState.rotateY !== 0);
        const hasZoom = zoomState.scale !== 1;

        let focusPxX = 0;
        let focusPxY = 0;

        if (hasZoom) {
            focusPxX = (zoomState.focusX / 100) * canvasWidth;
            focusPxY = (zoomState.focusY / 100) * canvasHeight;
        }

        const activeFragment = zoomFragments.find(
            f => frameTime >= f.startTime && frameTime <= f.endTime
        ) ?? zoomFragments
            .filter(f => f.endTime < frameTime)
            .sort((a, b) => b.endTime - a.endTime)[0];

        const targetScale = activeFragment ? zoomLevelToFactor(activeFragment.zoomLevel) : zoomState.scale;

        let pivotX = zoomCenterX;
        let pivotY = zoomCenterY;

        if (hasZoom && targetScale > 1) {
            pivotX = (targetScale * focusPxX - zoomCenterX) / (targetScale - 1);
            pivotY = (targetScale * focusPxY - zoomCenterY) / (targetScale - 1);
        }

        const applyVideoZoom = (c: CanvasRenderingContext2D) => {
            if (hasZoom) {
                c.translate(pivotX, pivotY);
                c.scale(zoomState.scale, zoomState.scale);
                c.translate(-pivotX, -pivotY);
            }
        };

        let fgCanvas: HTMLCanvasElement | null = null;
        let fgCtx: CanvasRenderingContext2D | null = null;

        const BLEED_FACTOR = 1.5;
        const fgWidth = canvasWidth * BLEED_FACTOR;
        const fgHeight = canvasHeight * BLEED_FACTOR;
        const fgOffsetX = (fgWidth - canvasWidth) / 2;
        const fgOffsetY = (fgHeight - canvasHeight) / 2;

        if (has3DEffect) {
            if (!foregroundCanvasRef.current) {
                foregroundCanvasRef.current = document.createElement("canvas");
            }

            fgCanvas = foregroundCanvasRef.current;

            if (fgCanvas.width !== fgWidth || fgCanvas.height !== fgHeight) {
                fgCanvas.width = fgWidth;
                fgCanvas.height = fgHeight;
            }

            fgCtx = fgCanvas.getContext("2d", canvasCtxOptions);

            if (fgCtx) {
                fgCtx.setTransform(1, 0, 0, 1, 0, 0);
                fgCtx.clearRect(0, 0, fgWidth, fgHeight);
                fgCtx.imageSmoothingEnabled = true;
                fgCtx.imageSmoothingQuality = "high";
            }
        }

        ctx.save();
        drawBg(ctx);
        ctx.restore();

        ctx.save();
        applyVideoZoom(ctx);
        await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, true);
        ctx.restore();

        const { containerX, containerY, containerWidth, containerHeight } = computeContainer();

        if (has3DEffect && fgCanvas && fgCtx) {
            fgCtx.save();
            fgCtx.translate(fgOffsetX, fgOffsetY);
            drawMockupAndMedia(fgCtx, containerX, containerY, containerWidth, containerHeight, video!, false);
            fgCtx.restore();

            applyPerspective3D(
                fgCanvas,
                zoomState.rotateX,
                zoomState.rotateY,
                zoomState.perspective * BLEED_FACTOR
            );

            ctx.save();
            applyVideoZoom(ctx);
            ctx.drawImage(fgCanvas, -fgOffsetX, -fgOffsetY, fgWidth, fgHeight);
            ctx.restore();
        } else {
            const hasVideoMask = !!(videoMaskConfig?.enabled && (
                videoMaskConfig.top ||
                videoMaskConfig.bottom ||
                videoMaskConfig.left ||
                videoMaskConfig.right ||
                videoMaskConfig.angle !== undefined
            ));

            if (hasVideoMask) {
                const videoLayer = document.createElement("canvas");
                videoLayer.width = canvasWidth;
                videoLayer.height = canvasHeight;

                const vlCtx = videoLayer.getContext("2d", canvasCtxOptions);

                if (vlCtx) {
                    vlCtx.imageSmoothingEnabled = true;
                    vlCtx.imageSmoothingQuality = "high";

                    drawMockupAndMedia(vlCtx, containerX, containerY, containerWidth, containerHeight, video!, false);

                    vlCtx.globalCompositeOperation = "destination-in";

                    const vm = videoMaskConfig!;
                    const [cX, cY, cW, cH] = [containerX, containerY, containerWidth, containerHeight];

                    if (vm.top) {
                        const g = vlCtx.createLinearGradient(cX, cY, cX, cY + cH);
                        g.addColorStop(0, "transparent");
                        g.addColorStop(vm.top.from / 100, "transparent");
                        g.addColorStop((vm.top.to ?? 100) / 100, "black");
                        vlCtx.fillStyle = g;
                        vlCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                    }

                    if (vm.bottom) {
                        const g = vlCtx.createLinearGradient(cX, cY + cH, cX, cY);
                        g.addColorStop(0, "transparent");
                        g.addColorStop(vm.bottom.from / 100, "transparent");
                        g.addColorStop((vm.bottom.to ?? 100) / 100, "black");
                        vlCtx.fillStyle = g;
                        vlCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                    }

                    if (vm.left) {
                        const g = vlCtx.createLinearGradient(cX, cY, cX + cW, cY);
                        g.addColorStop(0, "transparent");
                        g.addColorStop(vm.left.from / 100, "transparent");
                        g.addColorStop((vm.left.to ?? 100) / 100, "black");
                        vlCtx.fillStyle = g;
                        vlCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                    }

                    if (vm.right) {
                        const g = vlCtx.createLinearGradient(cX + cW, cY, cX, cY);
                        g.addColorStop(0, "transparent");
                        g.addColorStop(vm.right.from / 100, "transparent");
                        g.addColorStop((vm.right.to ?? 100) / 100, "black");
                        vlCtx.fillStyle = g;
                        vlCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                    }

                    if (vm.angle !== undefined) {
                        const angleRad = (vm.angle * Math.PI) / 180;
                        const cx2 = cX + cW / 2;
                        const cy2 = cY + cH / 2;
                        const diag = Math.sqrt(cW * cW + cH * cH) / 2;

                        const g = vlCtx.createLinearGradient(
                            cx2 - Math.cos(angleRad) * diag,
                            cy2 - Math.sin(angleRad) * diag,
                            cx2 + Math.cos(angleRad) * diag,
                            cy2 + Math.sin(angleRad) * diag
                        );

                        g.addColorStop(0, "transparent");
                        g.addColorStop((vm.angleFrom ?? 0) / 100, "transparent");
                        g.addColorStop((vm.angleTo ?? 100) / 100, "black");

                        vlCtx.fillStyle = g;
                        vlCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                    }

                    ctx.save();
                    applyVideoZoom(ctx);
                    ctx.drawImage(videoLayer, 0, 0);
                    ctx.restore();
                }
            } else {
                ctx.save();
                applyVideoZoom(ctx);
                drawMockupAndMedia(ctx, containerX, containerY, containerWidth, containerHeight, video!, false);
                ctx.restore();
            }
        }

        ctx.save();
        applyVideoZoom(ctx);
        await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, false);
        ctx.restore();

        drawSpotlightToCanvas(ctx, canvasWidth, canvasHeight);
        await drawCameraOverlay(ctx, canvasWidth, canvasHeight);
        drawCursorToCanvas(ctx, canvasWidth, canvasHeight, frameTime);
    };

    const drawCameraOverlay = async (
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number
    ) => {
        const camVideo = cameraVideoRef.current;
        const mainVideo = videoRef.current;

        if (!camVideo || !cameraConfig || !cameraConfig.enabled) return;
        if (!camVideo.videoWidth || !camVideo.videoHeight) return;

        if (mainVideo && camVideo.paused) {
            const targetTime = Math.min(mainVideo.currentTime, Math.max(0, camVideo.duration - 0.1));

            if (Math.abs(camVideo.currentTime - targetTime) > 0.05) {
                try {
                    camVideo.currentTime = targetTime;

                    await new Promise<void>((resolve) => {
                        const onSeeked = () => {
                            camVideo.removeEventListener("seeked", onSeeked);

                            const checkReady = setInterval(() => {
                                if (camVideo.readyState >= 2) {
                                    clearInterval(checkReady);
                                    clearTimeout(timeoutId);
                                    resolve();
                                }
                            }, 10);
                        };

                        const timeoutId = setTimeout(() => {
                            camVideo.removeEventListener("seeked", onSeeked);
                            resolve();
                        }, 2000);

                        camVideo.addEventListener("seeked", onSeeked);
                    });
                } catch (e) {
                    console.warn("Error en seek de la cámara:", e);
                }
            }
        }

        const { size, left: drawX, top: drawY } = getCameraLayout(
            cameraConfig,
            canvasWidth,
            canvasHeight
        );

        if (size <= 0) return;

        const shortSide = Math.min(canvasWidth, canvasHeight);
        const sizePercent = cameraConfig.size * 100;
        const sizeMultiplier = 0.5 + (sizePercent - 20) / 40;
        const srcShort = Math.min(camVideo.videoWidth, camVideo.videoHeight);
        const sx = (camVideo.videoWidth - srcShort) / 2;
        const sy = (camVideo.videoHeight - srcShort) / 2;

        ctx.save();

        ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
        ctx.shadowBlur = shortSide * 0.02;
        ctx.shadowOffsetY = shortSide * 0.008;

        if (cameraConfig.shape === "circle") {
            const centerX = drawX + size / 2;
            const centerY = drawY + size / 2;
            const radius = size / 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.clip();
        } else {
            const radius =
                cameraConfig.shape === "squircle"
                    ? Math.round(85 * sizeMultiplier)
                    : Math.round(6 * sizeMultiplier);

            drawRoundedRect(ctx, drawX, drawY, size, size, radius);
            ctx.fill();

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            drawRoundedRect(ctx, drawX, drawY, size, size, radius);
            ctx.clip();
        }

        if (camVideo && camVideo.readyState >= 2) {
            if (cameraConfig.mirror) {
                ctx.translate(drawX + size, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(camVideo, sx, sy, srcShort, srcShort, 0, 0, size, size);
            } else {
                ctx.drawImage(camVideo, sx, sy, srcShort, srcShort, drawX, drawY, size, size);
            }
        }

        ctx.restore();
    };

    useImperativeHandle(ref, () => ({
        getExportCanvas: () => exportCanvasRef.current,
        drawFrame,
        getPreviewContainer: () => previewContainerRef.current,
        clearAllSelection: () => {
            const prev = {
                multiIds: [...canvasSelectedIds],
                videoSelected: isVideoSelected,
            };

            setCanvasSelectedIds([]);
            setIsVideoSelected(false);

            return prev;
        },
        restoreSelectionState: (state: { multiIds: string[]; videoSelected: boolean }) => {
            setCanvasSelectedIds(state.multiIds);
            setIsVideoSelected(state.videoSelected);
        },
    }));

    return (
        <div
            className="flex-1 flex items-center justify-center min-h-0 min-w-0 overflow-hidden bg-[#09090B] p-2 sm:p-4 lg:p-1 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={(e) => {
                if (canvasElements.length === 0) return;

                const target = e.target as HTMLElement;

                if (!target.closest("[data-canvas-element]")) return;

                e.preventDefault();
                setCanvasCtxMenu({ x: e.clientX, y: e.clientY });
            }}
        >
            {mediaType === "image" && isDraggingOver && <DropImage />}

            {canvasCtxMenu && (() => {
                const ids = canvasSelectedIds.length > 0 ? canvasSelectedIds : selectedElementId ? [selectedElementId] : [];
                const isMulti = ids.length > 1;
                const singleId = ids[0] ?? null;

                return (
                    <div
                        data-canvas-ctx-menu
                        className="fixed z-[9999] bg-black border border-white/15 rounded-xl shadow-2xl py-1 min-w-45 overflow-hidden"
                        style={{
                            left: Math.min(canvasCtxMenu.x, window.innerWidth - 196),
                            top: Math.min(canvasCtxMenu.y, window.innerHeight - 160),
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {!isMulti && singleId && (
                            <>
                                <button
                                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11.5px] text-neutral-300 hover:bg-white/6 transition-colors text-left"
                                    onClick={() => {
                                        const maxZ = Math.max(...canvasElements.map(e => e.zIndex), VIDEO_Z_INDEX);
                                        if (onElementUpdate) onElementUpdate(singleId, { zIndex: maxZ + 1 });
                                        setCanvasCtxMenu(null);
                                    }}
                                >
                                    <Icon icon="qlementine-icons:bring-to-front-16" className="size-3.5 shrink-0 opacity-70" />
                                    Traer al frente
                                </button>

                                <button
                                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11.5px] text-neutral-300 hover:bg-white/6 transition-colors text-left"
                                    onClick={() => {
                                        const el = canvasElements.find(e => e.id === singleId);
                                        if (!el || !onElementUpdate) return;

                                        if (el.zIndex >= VIDEO_Z_INDEX) {
                                            onElementUpdate(singleId, { zIndex: VIDEO_Z_INDEX - 1 });
                                        } else {
                                            const minZ = Math.min(...canvasElements.map(e => e.zIndex));
                                            onElementUpdate(singleId, { zIndex: Math.max(1, minZ - 1) });
                                        }

                                        setCanvasCtxMenu(null);
                                    }}
                                >
                                    <Icon icon="qlementine-icons:bring-to-back-16" className="size-3.5 shrink-0 opacity-70" />
                                    Enviar atrás
                                </button>

                                <div className="my-1 h-px bg-white/6" />
                            </>
                        )}

                        {isMulti && (
                            <>
                                <button
                                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11.5px] text-neutral-300 hover:bg-white/6 transition-colors text-left"
                                    onClick={() => {
                                        const newGroupId = crypto.randomUUID();

                                        ids.forEach(id => {
                                            if (onElementUpdate) onElementUpdate(id, { groupId: newGroupId });
                                        });

                                        setCanvasCtxMenu(null);
                                    }}
                                >
                                    <Icon icon="solar:layers-minimalistic-bold" className="size-3.5 shrink-0 opacity-70" />
                                    Agrupar ({ids.length})
                                </button>

                                <button
                                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11.5px] text-neutral-300 hover:bg-white/6 transition-colors text-left"
                                    onClick={() => {
                                        const groupIds = new Set(
                                            ids.map(id => canvasElements.find(e => e.id === id)?.groupId).filter(Boolean)
                                        );

                                        canvasElements
                                            .filter(e => e.groupId && groupIds.has(e.groupId))
                                            .forEach(e => {
                                                if (onElementUpdate) onElementUpdate(e.id, { groupId: undefined });
                                            });

                                        setCanvasCtxMenu(null);
                                    }}
                                >
                                    <Icon icon="solar:layers-bold" className="size-3.5 shrink-0 opacity-70" />
                                    Desagrupar
                                </button>

                                <div className="my-1 h-px bg-white/6" />
                            </>
                        )}

                        <button
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11.5px] text-red-400 hover:bg-red-500/10 transition-colors text-left"
                            onClick={() => {
                                if (onElementDelete) onElementDelete(ids.length === 1 ? ids[0] : [...ids]);
                                setCanvasSelectedIds([]);
                                setCanvasCtxMenu(null);
                            }}
                        >
                            <Icon icon="solar:trash-bin-trash-bold" className="size-3.5 shrink-0 opacity-70" />
                            {isMulti ? `Eliminar ${ids.length} elementos` : "Eliminar"}
                        </button>
                    </div>
                );
            })()}

            <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: "radial-gradient(rgb(39, 39, 42) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                }}
            />

            <canvas ref={exportCanvasRef} className="hidden" />

            <div className="flex items-stretch min-h-0 min-w-0 w-full h-full justify-center gap-0">
                <div className="flex-1 flex items-center justify-center min-h-0 min-w-0">
                    <div
                        ref={previewContainerRef}
                        className={`relative shrink-0 overflow-hidden transition-all duration-300 ${
                            mediaType === "image" && imageUrl ? "" : "border border-white/20 rounded-xl"
                        }`}
                        style={{
                            aspectRatio: getAspectRatioStyle(aspectRatio, customAspectRatio ?? undefined),
                            maxWidth: getMaxWidth(aspectRatio, customAspectRatio ?? undefined),
                            width: "100%",
                            height: "auto",
                            maxHeight: "100%",
                            containerType: "size",
                        }}
                        onClick={(e) => {
                            if (
                                !(e.target as HTMLElement).closest("[data-canvas-element]") &&
                                !(e.target as HTMLElement).closest("[data-camera-overlay]") &&
                                !(e.target as HTMLElement).closest("[data-video-container]")
                            ) {
                                if (onElementSelect) onElementSelect(null);
                                setIsVideoSelected(false);
                                setCanvasSelectedIds([]);
                            }
                        }}
                    >
                        <div
                            className="absolute inset-0"
                            style={{
                                perspective: mediaType === "image" && imageTransform && apply3DToBackground ? `${imageTransform.perspective || 600}px` : "none",
                                perspectiveOrigin: "center center",
                            }}
                        >
                            {!(mediaType === "image" && apply3DToBackground) && (
                                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                                    <div
                                        className="absolute transition-all duration-200"
                                        style={{
                                            inset: backgroundBlur > 0 ? `-${backgroundBlur}px` : "0",
                                            ...(shouldShowCustomColor && backgroundColorCss
                                                ? backgroundColorCss.startsWith("#") || backgroundColorCss.startsWith("rgb")
                                                    ? { backgroundColor: backgroundColorCss }
                                                    : { backgroundImage: backgroundColorCss }
                                                : shouldShowCustomImage || shouldShowUnsplashOverride
                                                    ? {
                                                        backgroundImage: `url('${shouldShowCustomImage ? selectedImageUrl : unsplashOverrideUrl}')`,
                                                        backgroundSize: "cover",
                                                        backgroundPosition: "center",
                                                    }
                                                    : shouldShowWallpaper
                                                        ? {
                                                            backgroundImage: `url('${wallpaperUrl}')`,
                                                            backgroundSize: "cover",
                                                            backgroundPosition: "center",
                                                        }
                                                        : { backgroundColor: "transparent" }),
                                            filter: backgroundBlur > 0 ? `blur(${backgroundBlur * 0.4}px)` : "none",
                                        }}
                                    />
                                </div>
                            )}

                            <div
                                className="absolute inset-0 origin-center"
                                style={{
                                    transform: mediaType === "image" && imageTransform && apply3DToBackground
                                        ? `rotateX(${imageTransform.rotateX}deg) rotateY(${imageTransform.rotateY}deg) rotateZ(${imageTransform.rotateZ}deg) scale(${imageTransform.scale * imageZoomScale}) translateY(${imageTransform.translateY}%)`
                                        : `scale(${zoomTransform.scale}) translate(${zoomTransform.translateX}%, ${zoomTransform.translateY}%)`,
                                    perspective: !(mediaType === "image" && apply3DToBackground) && zoomTransform.perspective > 0
                                        ? `${(zoomTransform.perspective / 10.8).toFixed(1)}cqh`
                                        : "none",
                                    transformStyle: mediaType === "image" && apply3DToBackground ? "preserve-3d" : undefined,
                                    transition: mediaType === "image" && apply3DToBackground
                                        ? "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                                        : zoomTransform.isMoving
                                            ? `transform ${zoomTransform.transitionMs}ms linear`
                                            : `transform ${zoomTransform.transitionMs}ms ${ZOOM_EASING}`,
                                }}
                            >
                                {mediaType === "image" && apply3DToBackground && (
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, transform: "translateZ(-1px)" }}>
                                        <div
                                            className="absolute transition-all duration-200"
                                            style={{
                                                inset: "-50%",
                                                ...(shouldShowCustomColor && backgroundColorCss
                                                    ? backgroundColorCss.startsWith("#") || backgroundColorCss.startsWith("rgb")
                                                        ? { backgroundColor: backgroundColorCss }
                                                        : { backgroundImage: backgroundColorCss }
                                                    : shouldShowCustomImage || shouldShowUnsplashOverride
                                                        ? {
                                                            backgroundImage: `url('${shouldShowCustomImage ? selectedImageUrl : unsplashOverrideUrl}')`,
                                                            backgroundSize: "cover",
                                                            backgroundPosition: "center",
                                                        }
                                                        : shouldShowWallpaper
                                                            ? {
                                                                backgroundImage: `url('${wallpaperUrl}')`,
                                                                backgroundSize: "cover",
                                                                backgroundPosition: "center",
                                                            }
                                                            : { backgroundColor: "transparent" }),
                                                filter: backgroundBlur > 0 ? `blur(${backgroundBlur * 0.4}px)` : "none",
                                            }}
                                        />
                                    </div>
                                )}

                                <CanvasElementsLayer
                                    canvasContainerRef={canvasContainerRef}
                                    canvasElements={canvasElements}
                                    selectedElementId={selectedElementId}
                                    selectedElementIds={canvasSelectedIds}
                                    hoveredElementId={hoveredElementId}
                                    isDraggingElement={isDraggingElement}
                                    behindVideo={true}
                                    onElementSelect={handleElementSelect}
                                    onElementUpdate={onElementUpdate}
                                    setHoveredElementId={setHoveredElementId}
                                    setIsDraggingElement={setIsDraggingElement}
                                    setIsDraggingElementRotation={setIsDraggingElementRotation}
                                    elementDragStart={elementDragStart}
                                    layerZIndex={1}
                                    elementCorners={elementCorners}
                                    setElementCorners={setElementCorners}
                                    editingTextId={editingTextId}
                                    onTextEditEnd={(id, content) => {
                                        if (!content.trim()) {
                                            if (onElementDelete) onElementDelete(id);
                                        } else {
                                            if (onElementUpdate) onElementUpdate(id, { content });
                                        }

                                        setEditingTextId(null);
                                    }}
                                />

                                <div
                                    className="absolute inset-0 origin-center"
                                    style={{
                                        transform: zoomTransform.perspective > 0 ? `rotateX(${zoomTransform.rotateX}deg) rotateY(${zoomTransform.rotateY}deg)` : "none",
                                        transition: `transform ${zoomTransform.transitionMs}ms ${ZOOM_EASING}`,
                                        willChange: zoomTransform.perspective > 0 ? "transform" : "auto",
                                        transformStyle: "preserve-3d",
                                        zIndex: isVideoSelected ? 101 : 2,
                                        pointerEvents: "none",
                                    }}
                                >
                                    <div
                                        className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                                        style={{
                                            padding: `${padding * 0.5}%`,
                                            zIndex: isVideoSelected ? 101 : 2,
                                            pointerEvents: "none",
                                            ...(mediaType === "image" && imageTransform && !apply3DToBackground
                                                ? {
                                                    perspective: `${imageTransform.perspective || 600}px`,
                                                    perspectiveOrigin: "center center",
                                                }
                                                : {}),
                                        }}
                                    >
                                        <div
                                            ref={videoContainerRef}
                                            data-video-container
                                            className="relative flex w-full h-full items-center justify-center max-w-full max-h-full"
                                            style={{
                                                transform: mediaType === "image" && imageTransform && !apply3DToBackground
                                                    ? `
                                                        translate(${videoTransform.translateX}%, ${videoTransform.translateY}%)
                                                        rotate(${videoTransform.rotation}deg)
                                                        rotateX(${imageTransform.rotateX}deg)
                                                        rotateY(${imageTransform.rotateY}deg)
                                                        rotateZ(${imageTransform.rotateZ}deg)
                                                        scale(${imageTransform.scale * imageZoomScale})
                                                        translateY(${imageTransform.translateY}%)
                                                      `
                                                    : `translate(${videoTransform.translateX}%, ${videoTransform.translateY}%) rotate(${videoTransform.rotation}deg)`,
                                                cursor: isDraggingVideo ? "move" : isVideoHovered && hasMedia ? "move" : "default",
                                                transition: mediaType === "image" && imageTransform && !apply3DToBackground
                                                    ? "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                                                    : isDraggingVideo || isDraggingRotation
                                                        ? "none"
                                                        : "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                                                pointerEvents: "auto",
                                                transformStyle: mediaType === "image" && !apply3DToBackground ? "preserve-3d" : undefined,
                                            }}
                                            onMouseEnter={() => hasMedia && setIsVideoHovered(true)}
                                            onMouseLeave={() => {
                                                setIsVideoHovered(false);
                                                setVideoHoverCorner(null);
                                            }}
                                            onMouseDown={(e) => {
                                                if (!hasMedia || !onVideoTransformChange) return;
                                                if ((e.target as HTMLElement).closest("[data-rotation-handle]")) return;

                                                e.preventDefault();

                                                setIsVideoSelected(true);

                                                if (onElementSelect) onElementSelect(null);

                                                setVideoHoverCorner(getNearestCorner(e, videoTransform.rotation));
                                                setIsDraggingVideo(true);

                                                dragStartPos.current = {
                                                    x: e.clientX,
                                                    y: e.clientY,
                                                    initialRotation: videoTransform.rotation,
                                                    initialTranslateX: videoTransform.translateX,
                                                    initialTranslateY: videoTransform.translateY,
                                                };
                                            }}
                                            onMouseMove={(e) => {
                                                if (hasMedia) setVideoHoverCorner(getNearestCorner(e, videoTransform.rotation));
                                            }}
                                        >
                                            <div className="relative">
                                                {isVideoSelected && videoHoverCorner && hasMedia && onVideoTransformChange && !isDraggingVideo && !isDraggingRotation && (
                                                    <div
                                                        data-rotation-handle
                                                        style={getCornerStyle(videoHoverCorner, -14)}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();

                                                            lastAngleRef.current = null;
                                                            setIsDraggingRotation(true);

                                                            dragStartPos.current = {
                                                                x: e.clientX,
                                                                y: e.clientY,
                                                                initialRotation: videoTransform.rotation,
                                                                initialTranslateX: videoTransform.translateX,
                                                                initialTranslateY: videoTransform.translateY,
                                                            };
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                transform: `scale(${
                                                                    mediaType === "image" && imageTransform && !apply3DToBackground
                                                                        ? 1 / (imageTransform.scale * imageZoomScale)
                                                                        : 1
                                                                })`,
                                                                transformOrigin: "center center",
                                                            }}
                                                        >
                                                            <RotationHandleIcon corner={videoHoverCorner} color="#e5e7eb" />
                                                        </div>
                                                    </div>
                                                )}

                                                {(isVideoSelected || isVideoHovered) && hasMedia && !isDraggingRotation && (
                                                    <div
                                                        className={`absolute -inset-px border pointer-events-none z-10 opacity-80 ${
                                                            isVideoSelected ? "border-blue-500" : "border-white"
                                                        }`}
                                                        style={{ borderRadius: `${roundedCorners + 1}px` }}
                                                    />
                                                )}

                                                <div className="w-full h-full" style={hasMask && hasMockup ? maskStyles : {}}>
                                                    <MockupWrapper
                                                        mockupId={mockupId}
                                                        config={mockupConfig ?? DEFAULT_MOCKUP_CONFIG}
                                                        roundedCorners={roundedCorners}
                                                        shadows={shadows}
                                                    >
                                                        {hasMedia ? (
                                                            <div className="relative flex items-center justify-center overflow-hidden w-full h-full rounded-[inherit]">
                                                                {mediaType === "video" && videoUrl ? (
                                                                    <>
                                                                        <video
                                                                            key={videoUrl}
                                                                            ref={videoRef}
                                                                            preload="auto"
                                                                            playsInline
                                                                            className="w-full h-full object-contain"
                                                                            style={{
                                                                                ...(cropArea && (cropArea.width < 100 || cropArea.height < 100 || cropArea.x > 0 || cropArea.y > 0)
                                                                                    ? {
                                                                                        objectViewBox: `inset(${cropArea.y}% ${100 - cropArea.x - cropArea.width}% ${100 - cropArea.y - cropArea.height}% ${cropArea.x}%)`,
                                                                                    }
                                                                                    : {}),
                                                                                ...(hasMask && !hasMockup ? maskStyles : {}),
                                                                                opacity: currentThumbnail ? 0 : 1,
                                                                            }}
                                                                            onTimeUpdate={onTimeUpdate}
                                                                            onLoadedMetadata={onLoadedMetadata}
                                                                            onEnded={onEnded}
                                                                        />

                                                                        {currentThumbnail && (
                                                                            <img
                                                                                src={currentThumbnail.dataUrl}
                                                                                alt="Preview"
                                                                                crossOrigin="anonymous"
                                                                                className="absolute inset-0 w-full h-full object-contain"
                                                                                style={hasMask && !hasMockup ? maskStyles : {}}
                                                                            />
                                                                        )}
                                                                    </>
                                                                ) : mediaType === "image" && imageUrl ? (
                                                                    <>
                                                                        <img
                                                                            ref={imageRef as React.RefObject<HTMLImageElement>}
                                                                            src={imageUrl}
                                                                            alt="Editing image"
                                                                            crossOrigin="anonymous"
                                                                            className="w-full h-full object-contain"
                                                                            style={{
                                                                                ...(cropArea && (cropArea.width < 100 || cropArea.height < 100 || cropArea.x > 0 || cropArea.y > 0)
                                                                                    ? {
                                                                                        objectViewBox: `inset(${cropArea.y}% ${100 - cropArea.x - cropArea.width}% ${100 - cropArea.y - cropArea.height}% ${cropArea.x}%)`,
                                                                                    }
                                                                                    : {}),
                                                                                ...(hasMask && !hasMockup ? maskStyles : {}),
                                                                            }}
                                                                            onLoad={onLoadedMetadata}
                                                                        />

                                                                        <div
                                                                            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                                                                            style={{
                                                                                background: "radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.75) 100%)",
                                                                                opacity: isVideoHovered ? 1 : 0,
                                                                                zIndex: 10,
                                                                            }}
                                                                        />
                                                                    </>
                                                                ) : null}
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-full aspect-video min-w-75 bg-[#1E1E1E] border border-white/10 flex flex-col overflow-hidden">
                                                                <PlaceholderEditor
                                                                    onVideoUpload={mediaType === "video" ? onVideoUpload : onImageUpload}
                                                                    isUploading={isUploading}
                                                                    mediaType={mediaType}
                                                                />
                                                            </div>
                                                        )}
                                                    </MockupWrapper>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 transition-transform"
                                            style={{
                                                transform: mediaType === "image" && imageTransform && !apply3DToBackground
                                                    ? `translate(${videoTransform.translateX}%, ${videoTransform.translateY}%) rotate(${videoTransform.rotation}deg) rotateX(${imageTransform.rotateX}deg) rotateY(${imageTransform.rotateY}deg) rotateZ(${imageTransform.rotateZ}deg) translateY(${imageTransform.translateY}%)`
                                                    : `translate(${videoTransform.translateX}%, ${videoTransform.translateY}%) rotate(${videoTransform.rotation}deg)`,
                                                transformStyle: mediaType === "image" && !apply3DToBackground ? "preserve-3d" : undefined,
                                            }}
                                        >
                                            <EditorHoverTooltip show={isVideoHovered && mediaType === "image"} />
                                        </div>
                                    </div>
                                </div>

                                <CanvasElementsLayer
                                    canvasContainerRef={undefined}
                                    canvasElements={canvasElements}
                                    selectedElementId={selectedElementId}
                                    selectedElementIds={canvasSelectedIds}
                                    hoveredElementId={hoveredElementId}
                                    isDraggingElement={isDraggingElement}
                                    behindVideo={false}
                                    onElementSelect={handleElementSelect}
                                    onElementUpdate={onElementUpdate}
                                    setHoveredElementId={setHoveredElementId}
                                    setIsDraggingElement={setIsDraggingElement}
                                    setIsDraggingElementRotation={setIsDraggingElementRotation}
                                    elementDragStart={elementDragStart}
                                    layerZIndex={3}
                                    elementCorners={elementCorners}
                                    setElementCorners={setElementCorners}
                                    editingTextId={editingTextId}
                                    onTextEditEnd={(id, content) => {
                                        if (!content.trim()) {
                                            if (onElementDelete) onElementDelete(id);
                                        } else {
                                            if (onElementUpdate) onElementUpdate(id, { content });
                                        }

                                        setEditingTextId(null);
                                    }}
                                />

                                <CanvasElementsLayer
                                    canvasContainerRef={undefined}
                                    canvasElements={canvasElements}
                                    selectedElementId={selectedElementId}
                                    selectedElementIds={canvasSelectedIds}
                                    hoveredElementId={hoveredElementId}
                                    isDraggingElement={isDraggingElement}
                                    behindVideo={true}
                                    onElementSelect={(id) => {
                                        handleElementSelect(id);

                                        if (id) {
                                            if (!canvasSelectedIds.includes(id)) {
                                                setCanvasSelectedIds([id]);
                                                pendingCollapseRef.current = null;
                                            } else if (canvasSelectedIds.length > 1) {
                                                pendingCollapseRef.current = id;
                                            }
                                        } else {
                                            setCanvasSelectedIds([]);
                                            pendingCollapseRef.current = null;
                                        }
                                    }}
                                    onMultiSelect={setCanvasSelectedIds}
                                    onElementUpdate={onElementUpdate}
                                    setHoveredElementId={setHoveredElementId}
                                    setIsDraggingElement={setIsDraggingElement}
                                    setIsDraggingElementRotation={setIsDraggingElementRotation}
                                    elementDragStart={elementDragStart}
                                    layerZIndex={100}
                                    hitTestOnly={true}
                                    elementCorners={elementCorners}
                                    setElementCorners={setElementCorners}
                                    editingTextId={editingTextId}
                                    onDoubleClickText={(id) => setEditingTextId(id)}
                                    onTextEditEnd={(id, content) => {
                                        if (!content.trim()) {
                                            if (onElementDelete) onElementDelete(id);
                                        } else {
                                            if (onElementUpdate) onElementUpdate(id, { content });
                                        }

                                        setEditingTextId(null);
                                    }}
                                />


                                {activeSpotlightFragment && (
                                    <div
                                        data-spotlight-layer
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            zIndex: VIDEO_Z_INDEX + 150,
                                            backdropFilter: activeSpotlightFragment.blur ? `blur(${activeSpotlightFragment.blur}px)` : undefined,
                                        }}
                                    >
                                        <div
                                            className="absolute inset-0"
                                            style={{
                                                background: `rgba(0,0,0,${activeSpotlightFragment.intensity ?? 0.72})`,
                                                WebkitMaskImage:
                                                    activeSpotlightFragment.shape === "circle"
                                                        ? `radial-gradient(ellipse ${(activeSpotlightFragment.width / 2).toFixed(2)}% ${(activeSpotlightFragment.height / 2).toFixed(2)}% at ${activeSpotlightFragment.x}% ${activeSpotlightFragment.y}%, transparent 0%, transparent 96%, black 100%)`
                                                        : `radial-gradient(ellipse ${(activeSpotlightFragment.width / 1.65).toFixed(2)}% ${(activeSpotlightFragment.height / 1.65).toFixed(2)}% at ${activeSpotlightFragment.x}% ${activeSpotlightFragment.y}%, transparent 0%, transparent 58%, black 100%)`,
                                                maskImage:
                                                    activeSpotlightFragment.shape === "circle"
                                                        ? `radial-gradient(ellipse ${(activeSpotlightFragment.width / 2).toFixed(2)}% ${(activeSpotlightFragment.height / 2).toFixed(2)}% at ${activeSpotlightFragment.x}% ${activeSpotlightFragment.y}%, transparent 0%, transparent 96%, black 100%)`
                                                        : `radial-gradient(ellipse ${(activeSpotlightFragment.width / 1.65).toFixed(2)}% ${(activeSpotlightFragment.height / 1.65).toFixed(2)}% at ${activeSpotlightFragment.x}% ${activeSpotlightFragment.y}%, transparent 0%, transparent 58%, black 100%)`,
                                            }}
                                        />

                                        <div
                                            role="button"
                                            aria-label="Mover spotlight"
                                            tabIndex={0}
                                            className="absolute border shadow-[0_0_70px_rgba(255,255,255,0.22)] pointer-events-auto cursor-move border-amber-300/95 ring-2 ring-amber-300/45"
                                            style={{
                                                left: `${activeSpotlightFragment.x}%`,
                                                top: `${activeSpotlightFragment.y}%`,
                                                width: `${activeSpotlightFragment.width}%`,
                                                height: `${activeSpotlightFragment.height}%`,
                                                transform: "translate(-50%, -50%)",
                                                borderRadius:
                                                    activeSpotlightFragment.shape === "circle"
                                                        ? "9999px"
                                                        : activeSpotlightFragment.shape === "rounded"
                                                            ? `${activeSpotlightFragment.radius ?? 18}px`
                                                            : "2px",
                                                touchAction: "none",
                                            }}
                                            onPointerDown={(event) => handleSpotlightPointerDown(event, activeSpotlightFragment, "move")}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onSelectSpotlightFragment?.(activeSpotlightFragment.id);
                                            }}
                                        >
                                            {activeSpotlightFragment && (
                                                <>
                                                    <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40 bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.65)]" />
                                                    <div
                                                        role="button"
                                                        aria-label="Redimensionar spotlight"
                                                        className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border border-black/40 bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.65)]"
                                                        style={{ touchAction: "none" }}
                                                        onPointerDown={(event) => handleSpotlightPointerDown(event, activeSpotlightFragment, "resize")}
                                                        onClick={(event) => event.stopPropagation()}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {shouldShowSpotlight && cursorFrame && (
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            zIndex: VIDEO_Z_INDEX + 160,
                                            background: `radial-gradient(circle ${extendedCursorConfig.spotlightSize ?? 240}px at ${cursorFrame.x}% ${cursorFrame.y}%, transparent 0%, transparent 38%, rgba(0,0,0,${extendedCursorConfig.spotlightOpacity ?? 0.55}) 72%, rgba(0,0,0,${extendedCursorConfig.spotlightOpacity ?? 0.55}) 100%)`,
                                            backdropFilter: extendedCursorConfig.spotlightBlur ? `blur(${extendedCursorConfig.spotlightBlur}px)` : undefined,
                                        }}
                                    />
                                )}

                                {shouldShowCursorOverlay && cursorFrame && (
                                    <div
                                        className="absolute pointer-events-none"
                                        style={{
                                            zIndex: VIDEO_Z_INDEX + 180,
                                            left: `${cursorFrame.x}%`,
                                            top: `${cursorFrame.y}%`,
                                            transform: "translate(0, 0)",
                                        }}
                                    >
                                        {cursorConfig.clickEffect !== "none" && cursorFrame.clicking && (
                                            <div
                                                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping"
                                                style={{
                                                    width: cursorConfig.size * 1.5,
                                                    height: cursorConfig.size * 1.5,
                                                    backgroundColor: cursorConfig.clickEffect === "ripple" ? cursorConfig.clickEffectColor : "transparent",
                                                    border: cursorConfig.clickEffect === "ring" ? `2px solid ${cursorConfig.clickEffectColor}` : undefined,
                                                    opacity: 0.45,
                                                }}
                                            />
                                        )}

                                        <div
                                            className="relative"
                                            style={{
                                                transform: cursorConfig.style === "dot" ? "translate(-50%, -50%)" : "translate(0, 0)",
                                            }}
                                        >
                                            <CursorSvgPreview
                                                style={cursorConfig.style}
                                                color={cursorConfig.color}
                                                size={cursorConfig.size}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {isDraggingElement && (alignmentGuides.vertical.length > 0 || alignmentGuides.horizontal.length > 0) && (
                                <>
                                    {alignmentGuides.vertical.map((x, index) => (
                                        <div
                                            key={`v-${index}`}
                                            className="absolute top-0 bottom-0 w-0.5 bg-white/30 pointer-events-none"
                                            style={{ left: `${x}%`, zIndex: VIDEO_Z_INDEX + 100 }}
                                        />
                                    ))}

                                    {alignmentGuides.horizontal.map((y, index) => (
                                        <div
                                            key={`h-${index}`}
                                            className="absolute left-0 right-0 h-0.5 bg-white/30 pointer-events-none"
                                            style={{ top: `${y}%`, zIndex: VIDEO_Z_INDEX + 100 }}
                                        />
                                    ))}
                                </>
                            )}

                            {isDraggingVideo && (mockupAlignmentGuides.vertical.length > 0 || mockupAlignmentGuides.horizontal.length > 0) && (
                                <>
                                    {mockupAlignmentGuides.vertical.map((x, index) => (
                                        <div
                                            key={`mockup-v-${index}`}
                                            className="absolute top-0 bottom-0 w-0.5 bg-white/30 pointer-events-none"
                                            style={{ left: `${x}%`, zIndex: VIDEO_Z_INDEX + 100 }}
                                        />
                                    ))}

                                    {mockupAlignmentGuides.horizontal.map((y, index) => (
                                        <div
                                            key={`mockup-h-${index}`}
                                            className="absolute left-0 right-0 h-0.5 bg-white/30 pointer-events-none"
                                            style={{ top: `${y}%`, zIndex: VIDEO_Z_INDEX + 100 }}
                                        />
                                    ))}
                                </>
                            )}

                            {mediaType !== "image" && cameraUrl && cameraConfig?.enabled && (
                                <div data-camera-overlay className="absolute inset-0 pointer-events-none" style={{ zIndex: 4 }}>
                                    <div
                                        tabIndex={0}
                                        onClick={() => {
                                            if (onCameraClick) onCameraClick();
                                        }}
                                        onPointerDown={(e) => {
                                            if (!onCameraConfigChange || !cameraConfig) return;
                                            if (e.button !== 0) return;

                                            const container = previewContainerRef.current;
                                            if (!container) return;

                                            const rect = container.getBoundingClientRect();

                                            e.currentTarget.setPointerCapture(e.pointerId);

                                            cameraDragRef.current = {
                                                pointerId: e.pointerId,
                                                startX: e.clientX,
                                                startY: e.clientY,
                                                initialX: cameraConfig.position.x,
                                                initialY: cameraConfig.position.y,
                                                rect,
                                            };

                                            setIsDraggingCamera(true);
                                        }}
                                        onPointerMove={(e) => {
                                            const drag = cameraDragRef.current;

                                            if (!drag || drag.pointerId !== e.pointerId || !onCameraConfigChange) return;

                                            const dx = (e.clientX - drag.startX) / drag.rect.width;
                                            const dy = (e.clientY - drag.startY) / drag.rect.height;
                                            const nextX = Math.min(1, Math.max(0, drag.initialX + dx));
                                            const nextY = Math.min(1, Math.max(0, drag.initialY + dy));

                                            onCameraConfigChange({
                                                position: { x: nextX, y: nextY },
                                                corner: "custom",
                                            });
                                        }}
                                        onPointerUp={(e) => {
                                            const drag = cameraDragRef.current;

                                            if (!drag || drag.pointerId !== e.pointerId) return;

                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            cameraDragRef.current = null;
                                            setIsDraggingCamera(false);
                                        }}
                                        onPointerCancel={(e) => {
                                            const drag = cameraDragRef.current;

                                            if (!drag || drag.pointerId !== e.pointerId) return;

                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            cameraDragRef.current = null;
                                            setIsDraggingCamera(false);
                                        }}
                                        className={`absolute pointer-events-auto select-none outline-none group ${
                                            onCameraConfigChange ? isDraggingCamera ? "cursor-grabbing" : "cursor-grab" : ""
                                        }`}
                                        style={{
                                            width: `${cameraConfig.size * 100}cqmin`,
                                            aspectRatio: "1 / 1",
                                            left: `clamp(0px, calc(${cameraConfig.position.x * 100}% - ${cameraConfig.size * 50}cqmin), calc(100% - ${cameraConfig.size * 100}cqmin))`,
                                            top: `clamp(0px, calc(${cameraConfig.position.y * 100}% - ${cameraConfig.size * 50}cqmin), calc(100% - ${cameraConfig.size * 100}cqmin))`,
                                            transition: isDraggingCamera ? "none" : "left 120ms ease, top 120ms ease",
                                            touchAction: "none",
                                        }}
                                    >
                                        <video
                                            ref={cameraVideoRef}
                                            muted
                                            playsInline
                                            preload="auto"
                                            className={`size-full object-cover shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition-shadow duration-200 ring-1 ring-white/15 group-hover:ring-1 group-hover:ring-white group-focus:ring-1 group-focus:ring-white ${
                                                cameraConfig.shape === "squircle" ? "squircle-element-camera" : ""
                                            }`}
                                            style={{
                                                borderRadius:
                                                    cameraConfig.shape === "circle"
                                                        ? "50%"
                                                        : cameraConfig.shape === "squircle"
                                                            ? `${Math.round(20 * (0.5 + (cameraConfig.size * 100 - 20) / 40))}px`
                                                            : `${Math.round(6 * (0.5 + (cameraConfig.size * 100 - 20) / 40))}px`,
                                                transform: cameraConfig.mirror ? "scaleX(-1)" : undefined,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {textToolActive && (
                                <div
                                    className="absolute inset-0 cursor-crosshair"
                                    style={{ zIndex: 99999 }}
                                    onClick={(e) => {
                                        e.stopPropagation();

                                        if (!onAddElement) return;

                                        const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                                        const maxZ = canvasElements.length > 0 ? Math.max(...canvasElements.map(el => el.zIndex)) : 1000;
                                        const newId = `text-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

                                        const newEl = {
                                            id: newId,
                                            type: "text" as const,
                                            x,
                                            y,
                                            width: 30,
                                            height: 5,
                                            rotation: 0,
                                            opacity: 1,
                                            zIndex: maxZ + 1,
                                            content: "",
                                            fontSize: 48,
                                            fontFamily: "Inter, sans-serif",
                                            fontWeight: "bold" as const,
                                            color: "#ffffff",
                                        };

                                        onAddElement(newEl);
                                        setEditingTextId(newId);

                                        if (onTextToolDeactivate) onTextToolDeactivate();
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 self-stretch flex items-stretch z-10">
                    <LayersPanel
                        elements={canvasElements}
                        selectedId={selectedElementId}
                        selectedMultiIds={canvasSelectedIds}
                        onSelect={(id) => {
                            if (handleElementSelect) handleElementSelect(id);
                        }}
                        onMultiSelect={(ids) => {
                            setCanvasSelectedIds(ids);

                            if (ids.length === 1) handleElementSelect(ids[0]);
                            else if (ids.length === 0) handleElementSelect(null);
                        }}
                        onDelete={(idOrIds) => {
                            if (onElementDelete) onElementDelete(idOrIds);
                        }}
                        onReorder={(orderedIds) => {
                            orderedIds.forEach((id, pos) => {
                                if (onElementUpdate) onElementUpdate(id, { zIndex: VIDEO_Z_INDEX + 500 - pos });
                            });
                        }}
                        onSetGroupId={(id, groupId) => {
                            if (onElementUpdate) onElementUpdate(id, { groupId });
                        }}
                        onToggleVisible={(id, visible) => {
                            if (onElementUpdate) onElementUpdate(id, { visible });
                        }}
                        onToggleLock={(id, locked) => {
                            if (onElementUpdate) onElementUpdate(id, { locked });
                        }}
                        onBringToFront={(id) => {
                            const maxZ = Math.max(...canvasElements.map(e => e.zIndex), VIDEO_Z_INDEX);
                            if (onElementUpdate) onElementUpdate(id, { zIndex: maxZ + 1 });
                        }}
                        onSendToBack={(id) => {
                            const el = canvasElements.find(e => e.id === id);

                            if (!el || !onElementUpdate) return;

                            if (el.zIndex >= VIDEO_Z_INDEX) {
                                onElementUpdate(id, { zIndex: VIDEO_Z_INDEX - 1 });
                            } else {
                                const minZ = Math.min(...canvasElements.map(e => e.zIndex));
                                onElementUpdate(id, { zIndex: Math.max(1, minZ - 1) });
                            }
                        }}
                        onGroup={(ids) => {
                            const newGroupId = crypto.randomUUID();

                            ids.forEach(id => {
                                if (onElementUpdate) onElementUpdate(id, { groupId: newGroupId });
                            });
                        }}
                        onUngroup={(ids) => {
                            const groupIds = new Set(
                                ids.map(id => canvasElements.find(e => e.id === id)?.groupId).filter(Boolean)
                            );

                            canvasElements
                                .filter(e => e.groupId && groupIds.has(e.groupId))
                                .forEach(e => {
                                    if (onElementUpdate) onElementUpdate(e.id, { groupId: undefined });
                                });
                        }}
                        toolbar={layersPanelToolbar}
                        videoLayerVisible={!!(videoUrl || imageUrl)}
                        isVideoLayerSelected={selectedElementId === null && canvasSelectedIds.length === 0}
                        onVideoLayerSelect={() => {
                            handleElementSelect(null);
                            setCanvasSelectedIds([]);
                        }}
                        mediaType={mediaType}
                        hoveredElementId={hoveredElementId}
                        onHoverElement={setHoveredElementId}
                    />
                </div>
            </div>
        </div>
    );
});
