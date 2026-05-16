import { ZoomFragment } from "./zoom.types";
import type { AudioTrack, UploadedAudio } from "./audio.types";
import type { VideoTrackClip } from "./video-track.types";
import type { SpotlightFragment } from "./spotlight.types";
import type { EditableMaskFragment } from "./mask-fragment.types";
import type { CaptionSegment } from "./caption.types";

export interface TrimRange {
    start: number;
    end: number;
}

export interface TimelineProps {
    videoDuration: number;
    currentTime: number;
    onSeek: (time: number) => void;
    videoUrl?: string | null;
    zoomLevel: number;
    isDraggingPlayhead?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    trimRange: TrimRange;
    onTrimChange: (range: TrimRange) => void;
    // Video clips props (multi-video support)
    videoClips?: VideoTrackClip[];
    selectedVideoClipId?: string | null;
    onSelectVideoClip?: (clipId: string | null) => void;
    onUpdateVideoClip?: (clipId: string, updates: Partial<VideoTrackClip>) => void;
    onDeleteVideoClip?: (clipId: string) => void;
    // Zoom props
    zoomFragments?: ZoomFragment[];
    selectedZoomFragmentId?: string | null;
    onSelectZoomFragment?: (fragmentId: string | null) => void;
    onAddZoomFragment?: (startTime: number) => void;
    onUpdateZoomFragment?: (fragmentId: string, updates: Partial<ZoomFragment>) => void;
    onActivateZoomTool?: () => void;
    // Spotlight props
    spotlightFragments?: SpotlightFragment[];
    selectedSpotlightFragmentId?: string | null;
    onSelectSpotlightFragment?: (fragmentId: string | null) => void;
    onAddSpotlightFragment?: (startTime: number) => void;
    onUpdateSpotlightFragment?: (fragmentId: string, updates: Partial<SpotlightFragment>) => void;
    // Mask props
    maskFragments?: EditableMaskFragment[];
    selectedMaskFragmentId?: string | null;
    onSelectMaskFragment?: (fragmentId: string | null) => void;
    onAddMaskFragment?: (startTime: number) => void;
    onUpdateMaskFragment?: (fragmentId: string, updates: Partial<EditableMaskFragment>) => void;
    onDuplicateMaskFragment?: (fragment: EditableMaskFragment) => void;
    effectInsertMode?: "spotlight" | "mask";
    // Captions props
    captionSegments?: CaptionSegment[];
    selectedCaptionSegmentId?: string | null;
    onSelectCaptionSegment?: (segmentId: string | null) => void;
    onUpdateCaptionSegment?: (segmentId: string, updates: Partial<CaptionSegment>) => void;
    // Audio props
    audioTracks?: AudioTrack[];
    uploadedAudios?: UploadedAudio[];
    selectedAudioTrackId?: string | null;
    onSelectAudioTrack?: (trackId: string | null) => void;
    onUpdateAudioTrack?: (trackId: string, updates: Partial<AudioTrack>) => void;
}
