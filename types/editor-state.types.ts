import type {
    BackgroundTab,
    AspectRatio,
    BackgroundColorConfig,
    CropArea,
    ZoomFragment,
    AudioTrack,
    SpotlightFragment,
} from "@/types";
import type { EditableMaskFragment } from "@/types/mask-fragment.types";

import type { TrimRange } from "@/types/timeline.types";
import type { MockupConfig } from "@/types/mockup.types";
import type { CanvasElement } from "@/types/canvas-elements.types";
import type { CameraConfig } from "@/types/camera.types";
import type {
    Preview3DConfig,
    ImageMaskConfig,
} from "@/types/photo.types";

import type { CursorConfig } from "@/types/cursor.types";
import { DEFAULT_CURSOR_CONFIG } from "@/types/cursor.types";

export interface VideoTransform {
    rotation: number;
    translateX: number;
    translateY: number;
}

export interface EditorState {
    backgroundTab: BackgroundTab;
    selectedWallpaper: number;
    backgroundBlur: number;
    padding: number;
    roundedCorners: number;
    shadows: number;
    selectedImageUrl: string;
    backgroundColorConfig: BackgroundColorConfig | null;
    aspectRatio: AspectRatio;
    customDimensions: { width: number; height: number } | null;
    cropArea: CropArea | undefined;
    trimRange: TrimRange;
    zoomFragments: ZoomFragment[];
    spotlightFragments: SpotlightFragment[];
    maskFragments: EditableMaskFragment[];
    mockupId: string;
    mockupConfig: MockupConfig;
    canvasElements: CanvasElement[];
    audioTracks: AudioTrack[];
    muteOriginalAudio: boolean;
    masterVolume: number;

    cursorConfig: CursorConfig;

    cameraConfig: CameraConfig | null;

    videoTransform: VideoTransform;

    imageTransform: Preview3DConfig;
    apply3DToBackground: boolean;

    imageMaskConfig: ImageMaskConfig;
    videoMaskConfig: ImageMaskConfig;
}

export function createInitialEditorState(
    overrides?: Partial<EditorState>
): EditorState {
    return {
        backgroundTab: "wallpaper",
        selectedWallpaper: 0,
        backgroundBlur: 0,
        padding: 10,
        roundedCorners: 10,
        shadows: 10,

        selectedImageUrl: "",

        backgroundColorConfig: null,

        aspectRatio: "auto",
        customDimensions: null,

        cropArea: undefined,

        trimRange: {
            start: 0,
            end: 0,
        },

        zoomFragments: [],
        spotlightFragments: [],
        maskFragments: [],

        mockupId: "none",

        mockupConfig: {
            darkMode: false,
            frameColor: "#000000",
            url: "",
            headerScale: 100,
            headerOpacity: 100,
            cornerRadius: 10,
        },

        canvasElements: [],

        audioTracks: [],

        muteOriginalAudio: false,
        masterVolume: 1,

        cursorConfig: DEFAULT_CURSOR_CONFIG,

        cameraConfig: null,

        videoTransform: {
            rotation: 0,
            translateX: 0,
            translateY: 0,
        },

        imageTransform: {
            id: "front",
            label: "Front",
            rotateX: 0,
            rotateY: 0,
            rotateZ: 0,
            translateY: 0,
            scale: 0.9,
            perspective: 600,
        },

        apply3DToBackground: false,

        imageMaskConfig: {
            enabled: false,
        },

        videoMaskConfig: {
            enabled: false,
        },

        ...overrides,
    };
}
