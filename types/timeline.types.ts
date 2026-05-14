import { ZoomFragment } from "./zoom.types";
import type { AudioTrack, UploadedAudio } from "./audio.types";
import type { VideoTrackClip } from "./video-track.types";
import type { SpotlightFragment } from "./spotlight.types";

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
    // Audio props
    audioTracks?: AudioTrack[];
    uploadedAudios?: UploadedAudio[];
    selectedAudioTrackId?: string | null;
    onSelectAudioTrack?: (trackId: string | null) => void;
    onUpdateAudioTrack?: (trackId: string, updates: Partial<AudioTrack>) => void;
}
