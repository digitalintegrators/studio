/**
 * Cursor SVG Components - Custom cursor overlays for video recordings
 * 
 * Provides SVG cursors in three styles: macOS, Windows, and Dot
 * Each style supports multiple cursor states (default, pointer, text, etc.)
 */

import type { CursorState, CursorStyle } from "@/types/cursor.types";

interface CursorSvgProps {
    color?: string;
    size?: number;
    className?: string;
}

// ============================================================================
// macOS Cursors
// ============================================================================

/** macOS default arrow cursor */
export const MacDefaultCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87c.48 0 .73-.58.39-.92L5.84 2.86a.5.5 0 00-.34-.15c-.28 0-.5.22-.5.5z" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1.5"
        />
    </svg>
);

/** macOS pointer (hand) cursor */
export const MacPointerCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M9.5 5v9.795a.75.75 0 01-1.28.53l-2.72-2.72a1 1 0 00-1.41 0l-.1.1a1 1 0 000 1.41l4.54 4.54a2 2 0 001.41.59h6.1a2 2 0 002-2V13.5a1 1 0 00-1-1h-.5v-1a1 1 0 00-1-1h-.5V10a1 1 0 00-1-1h-.5V5.5a1 1 0 00-1-1h-1a1 1 0 00-1 1v-.5z" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1.2"
        />
    </svg>
);

/** macOS text (I-beam) cursor */
export const MacTextCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M12 4V20M8 4H16M8 20H16" 
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
        />
        <path 
            d="M12 4V20M8 4H16M8 20H16" 
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </svg>
);

/** macOS crosshair cursor */
export const MacCrosshairCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <circle cx="12" cy="12" r="8" stroke="#FFFFFF" strokeWidth="3" fill="none" />
        <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" fill="none" />
        <path d="M12 2V8M12 16V22M2 12H8M16 12H22" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <path d="M12 2V8M12 16V22M2 12H8M16 12H22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

/** macOS grab (open hand) cursor */
export const MacGrabCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M8 12V7a1 1 0 112 0v4m0 0V6a1 1 0 112 0v5m0 0V6.5a1 1 0 112 0V11m0 0V8a1 1 0 112 0v6a5 5 0 01-5 5h-2a5 5 0 01-5-5v-2a1 1 0 011-1h1" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

/** macOS grabbing (closed hand) cursor */
export const MacGrabbingCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M18 11V14a5 5 0 01-5 5h-2a5 5 0 01-5-5v-3a1 1 0 011-1h1a1 1 0 011 1v0m9 0a1 1 0 00-1-1h0a1 1 0 00-1 1v0m2-1v-1a1 1 0 00-1-1h0a1 1 0 00-1 1v1m0 0a1 1 0 00-1-1h0a1 1 0 00-1 1v1m0-1V9a1 1 0 00-1-1h0a1 1 0 00-1 1v1" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

/** macOS wait (spinner) cursor */
export const MacWaitCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <circle cx="12" cy="12" r="9" stroke="#FFFFFF" strokeWidth="3" fill="none" />
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none" strokeDasharray="40 60" />
        <circle cx="12" cy="12" r="4" fill={color} />
    </svg>
);

/** macOS not-allowed cursor */
export const MacNotAllowedCursor = ({ color: _color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <circle cx="12" cy="12" r="9" stroke="#FFFFFF" strokeWidth="3" fill="none" />
        <circle cx="12" cy="12" r="9" stroke="#EF4444" strokeWidth="1.5" fill="none" />
        <path d="M5.5 18.5L18.5 5.5" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <path d="M5.5 18.5L18.5 5.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

/** macOS move cursor */
export const MacMoveCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M12 3L8 7h3v4H7V8l-4 4 4 4v-3h4v4H8l4 4 4-4h-3v-4h4v3l4-4-4-4v3h-4V7h3l-4-4z" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1"
        />
    </svg>
);

/** macOS resize cursor */
export const MacResizeCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M4 9L4 4L9 4M15 4L20 4L20 9M20 15L20 20L15 20M9 20L4 20L4 15" 
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path 
            d="M4 9L4 4L9 4M15 4L20 4L20 9M20 15L20 20L15 20M9 20L4 20L4 15" 
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// ============================================================================
// Windows Cursors
// ============================================================================

/** Windows default arrow cursor */
export const WinDefaultCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M4 4L4 20L9 15L12 21L14 20L11 14L17 14L4 4Z" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
        />
    </svg>
);

/** Windows pointer (hand) cursor */
export const WinPointerCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M11 4v7h-1a2 2 0 00-2 2v1a6 6 0 006 6h1a5 5 0 005-5v-4a2 2 0 00-2-2h-1V7a2 2 0 00-2-2h0a2 2 0 00-2 2v2a2 2 0 00-4 0V4a2 2 0 00-2-2h0a2 2 0 00-2 2v7" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1.2"
        />
    </svg>
);

/** Windows text (I-beam) cursor */
export const WinTextCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M12 3V21M9 3H15M9 21H15" 
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
        />
        <path 
            d="M12 3V21M9 3H15M9 21H15" 
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

/** Windows crosshair cursor */
export const WinCrosshairCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path d="M12 2V22M2 12H22" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <path d="M12 2V22M2 12H22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <rect x="10" y="10" width="4" height="4" fill="#FFFFFF" stroke={color} strokeWidth="1" />
    </svg>
);

/** Windows grab cursor */
export const WinGrabCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M7 11v-1a2 2 0 114 0m0 0v-1a2 2 0 114 0v1m0 0a2 2 0 114 0v5a7 7 0 01-7 7h-1a7 7 0 01-7-7v-2a2 2 0 114 0" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

/** Windows grabbing cursor */
export const WinGrabbingCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M7 15v-3a2 2 0 012-2h0a2 2 0 012 2m0 0a2 2 0 012-2h0a2 2 0 012 2m0 0a2 2 0 012-2h0a2 2 0 012 2v3a7 7 0 01-7 7h-1a7 7 0 01-7-7v-3a2 2 0 114 0" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

/** Windows wait cursor */
export const WinWaitCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
        <path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/** Windows not-allowed cursor */
export const WinNotAllowedCursor = ({ color: _color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke="#EF4444" strokeWidth="2" />
        <path d="M7 7L17 17" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

/** Windows move cursor */
export const WinMoveCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M12 2L9 5h2v5H6V8l-3 4 3 4v-2h5v5H9l3 3 3-3h-2v-5h5v2l3-4-3-4v2h-5V5h2l-3-3z" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1"
            strokeLinejoin="round"
        />
    </svg>
);

/** Windows resize cursor */
export const WinResizeCursor = ({ color = "#000000", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
    >
        <path 
            d="M4 4L10 4L4 10L4 4ZM20 20L14 20L20 14L20 20Z" 
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1.5"
        />
        <path d="M4 4L20 20" stroke="#FFFFFF" strokeWidth="3" />
        <path d="M4 4L20 20" stroke={color} strokeWidth="1.5" />
    </svg>
);

// ============================================================================
// Dot Cursors (Minimalist)
// ============================================================================

/** Dot default cursor */
export const DotDefaultCursor = ({ color = "#FFFFFF", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
    >
        <circle 
            cx="12" 
            cy="12" 
            r="6" 
            fill={color}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="2"
        />
    </svg>
);

/** Dot pointer cursor - slightly larger */
export const DotPointerCursor = ({ color = "#FFFFFF", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
    >
        <circle 
            cx="12" 
            cy="12" 
            r="8" 
            fill={color}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="2"
        />
    </svg>
);

/** Dot text cursor - vertical line */
export const DotTextCursor = ({ color = "#FFFFFF", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
    >
        <rect 
            x="10" 
            y="4" 
            width="4" 
            height="16" 
            rx="2"
            fill={color}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
        />
    </svg>
);

/** Dot crosshair cursor */
export const DotCrosshairCursor = ({ color = "#FFFFFF", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
    >
        <circle 
            cx="12" 
            cy="12" 
            r="3" 
            fill={color}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
        />
        <circle 
            cx="12" 
            cy="12" 
            r="8" 
            fill="none"
            stroke={color}
            strokeWidth="2"
        />
    </svg>
);

/** Dot grab cursor */
export const DotGrabCursor = ({ color = "#FFFFFF", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
    >
        <circle cx="8" cy="12" r="3" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
        <circle cx="16" cy="12" r="3" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
    </svg>
);

/** Dot grabbing cursor */
export const DotGrabbingCursor = ({ color = "#FFFFFF", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
    >
        <ellipse 
            cx="12" 
            cy="12" 
            rx="8" 
            ry="4" 
            fill={color}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="2"
        />
    </svg>
);

/** Dot wait cursor */
export const DotWaitCursor = ({ color = "#FFFFFF", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
    >
        <circle 
            cx="12" 
            cy="12" 
            r="6" 
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray="20 10"
        />
    </svg>
);

/** Dot not-allowed cursor */
export const DotNotAllowedCursor = ({ color = "#EF4444", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
    >
        <circle 
            cx="12" 
            cy="12" 
            r="8" 
            fill="none"
            stroke={color}
            strokeWidth="3"
        />
        <path d="M6 18L18 6" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
);

/** Dot move cursor */
export const DotMoveCursor = ({ color = "#FFFFFF", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
    >
        <circle cx="12" cy="12" r="4" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
        <circle cx="12" cy="4" r="2" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
        <circle cx="12" cy="20" r="2" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
        <circle cx="4" cy="12" r="2" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
        <circle cx="20" cy="12" r="2" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
    </svg>
);

/** Dot resize cursor */
export const DotResizeCursor = ({ color = "#FFFFFF", size = 24, className }: CursorSvgProps) => (
    <svg 
        className={className} 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
    >
        <circle cx="6" cy="6" r="4" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
        <circle cx="18" cy="18" r="4" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
        <path d="M8 8L16 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// ============================================================================
// Cursor Component Maps
// ============================================================================

type CursorComponentMap = {
    [state in CursorState]: React.FC<CursorSvgProps>;
};

export const MAC_CURSORS: CursorComponentMap = {
    default: MacDefaultCursor,
    pointer: MacPointerCursor,
    text: MacTextCursor,
    crosshair: MacCrosshairCursor,
    grab: MacGrabCursor,
    grabbing: MacGrabbingCursor,
    wait: MacWaitCursor,
    progress: MacWaitCursor,
    "not-allowed": MacNotAllowedCursor,
    move: MacMoveCursor,
    resize: MacResizeCursor,
};

export const WIN_CURSORS: CursorComponentMap = {
    default: WinDefaultCursor,
    pointer: WinPointerCursor,
    text: WinTextCursor,
    crosshair: WinCrosshairCursor,
    grab: WinGrabCursor,
    grabbing: WinGrabbingCursor,
    wait: WinWaitCursor,
    progress: WinWaitCursor,
    "not-allowed": WinNotAllowedCursor,
    move: WinMoveCursor,
    resize: WinResizeCursor,
};

export const DOT_CURSORS: CursorComponentMap = {
    default: DotDefaultCursor,
    pointer: DotPointerCursor,
    text: DotTextCursor,
    crosshair: DotCrosshairCursor,
    grab: DotGrabCursor,
    grabbing: DotGrabbingCursor,
    wait: DotWaitCursor,
    progress: DotWaitCursor,
    "not-allowed": DotNotAllowedCursor,
    move: DotMoveCursor,
    resize: DotResizeCursor,
};

/**
 * Get the appropriate cursor component for a given style and state
 */
export function getCursorComponent(
    style: CursorStyle,
    state: CursorState
): React.FC<CursorSvgProps> | null {
    switch (style) {
        case "mac":
            return MAC_CURSORS[state];
        case "windows":
            return WIN_CURSORS[state];
        case "dot":
            return DOT_CURSORS[state];
        case "none":
        default:
            return null;
    }
}

/**
 * Generate SVG data URL for canvas rendering
 */
export function getCursorSvgDataUrl(
    style: CursorStyle,
    state: CursorState,
    color: string,
    size: number
): string | null {
    if (style === "none") return null;

    const svgStrings: Partial<Record<CursorStyle, Record<CursorState, string>>> = {
        none: {} as Record<CursorState, string>,
        mac: {
            default: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87c.48 0 .73-.58.39-.92L5.84 2.86a.5.5 0 00-.34-.15c-.28 0-.5.22-.5.5z" fill="#FFFFFF" stroke="${color}" stroke-width="1.5"/></svg>`,
            pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M9.5 5v9.795a.75.75 0 01-1.28.53l-2.72-2.72a1 1 0 00-1.41 0l-.1.1a1 1 0 000 1.41l4.54 4.54a2 2 0 001.41.59h6.1a2 2 0 002-2V13.5a1 1 0 00-1-1h-.5v-1a1 1 0 00-1-1h-.5V10a1 1 0 00-1-1h-.5V5.5a1 1 0 00-1-1h-1a1 1 0 00-1 1v-.5z" fill="#FFFFFF" stroke="${color}" stroke-width="1.2"/></svg>`,
            text: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M12 4V20M8 4H16M8 20H16" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><path d="M12 4V20M8 4H16M8 20H16" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
            crosshair: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#FFFFFF" stroke-width="3" fill="none"/><circle cx="12" cy="12" r="8" stroke="${color}" stroke-width="1.5" fill="none"/><path d="M12 2V8M12 16V22M2 12H8M16 12H22" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><path d="M12 2V8M12 16V22M2 12H8M16 12H22" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
            grab: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M8 12V7a1 1 0 112 0v4m0 0V6a1 1 0 112 0v5m0 0V6.5a1 1 0 112 0V11m0 0V8a1 1 0 112 0v6a5 5 0 01-5 5h-2a5 5 0 01-5-5v-2a1 1 0 011-1h1" fill="#FFFFFF" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            grabbing: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M18 11V14a5 5 0 01-5 5h-2a5 5 0 01-5-5v-3a1 1 0 011-1h1a1 1 0 011 1v0m9 0a1 1 0 00-1-1h0a1 1 0 00-1 1v0m2-1v-1a1 1 0 00-1-1h0a1 1 0 00-1 1v1m0 0a1 1 0 00-1-1h0a1 1 0 00-1 1v1m0-1V9a1 1 0 00-1-1h0a1 1 0 00-1 1v1" fill="#FFFFFF" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            wait: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#FFFFFF" stroke-width="3" fill="none"/><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="1.5" fill="none" stroke-dasharray="40 60"/><circle cx="12" cy="12" r="4" fill="${color}"/></svg>`,
            progress: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#FFFFFF" stroke-width="3" fill="none"/><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="1.5" fill="none" stroke-dasharray="40 60"/><circle cx="12" cy="12" r="4" fill="${color}"/></svg>`,
            "not-allowed": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#FFFFFF" stroke-width="3" fill="none"/><circle cx="12" cy="12" r="9" stroke="#EF4444" stroke-width="1.5" fill="none"/><path d="M5.5 18.5L18.5 5.5" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><path d="M5.5 18.5L18.5 5.5" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"/></svg>`,
            move: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M12 3L8 7h3v4H7V8l-4 4 4 4v-3h4v4H8l4 4 4-4h-3v-4h4v3l4-4-4-4v3h-4V7h3l-4-4z" fill="#FFFFFF" stroke="${color}" stroke-width="1"/></svg>`,
            resize: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M4 9L4 4L9 4M15 4L20 4L20 9M20 15L20 20L15 20M9 20L4 20L4 15" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9L4 4L9 4M15 4L20 4L20 9M20 15L20 20L15 20M9 20L4 20L4 15" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        },
        windows: {
            default: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M4 4L4 20L9 15L12 21L14 20L11 14L17 14L4 4Z" fill="#FFFFFF" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
            pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M11 4v7h-1a2 2 0 00-2 2v1a6 6 0 006 6h1a5 5 0 005-5v-4a2 2 0 00-2-2h-1V7a2 2 0 00-2-2h0a2 2 0 00-2 2v2a2 2 0 00-4 0V4a2 2 0 00-2-2h0a2 2 0 00-2 2v7" fill="#FFFFFF" stroke="${color}" stroke-width="1.2"/></svg>`,
            text: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M12 3V21M9 3H15M9 21H15" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/><path d="M12 3V21M9 3H15M9 21H15" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`,
            crosshair: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M12 2V22M2 12H22" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><path d="M12 2V22M2 12H22" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/><rect x="10" y="10" width="4" height="4" fill="#FFFFFF" stroke="${color}" stroke-width="1"/></svg>`,
            grab: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M7 11v-1a2 2 0 114 0m0 0v-1a2 2 0 114 0v1m0 0a2 2 0 114 0v5a7 7 0 01-7 7h-1a7 7 0 01-7-7v-2a2 2 0 114 0" fill="#FFFFFF" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            grabbing: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M7 15v-3a2 2 0 012-2h0a2 2 0 012 2m0 0a2 2 0 012-2h0a2 2 0 012 2m0 0a2 2 0 012-2h0a2 2 0 012 2v3a7 7 0 01-7 7h-1a7 7 0 01-7-7v-3a2 2 0 114 0" fill="#FFFFFF" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            wait: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke="${color}" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            progress: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke="${color}" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            "not-allowed": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke="#EF4444" stroke-width="2"/><path d="M7 7L17 17" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/></svg>`,
            move: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M12 2L9 5h2v5H6V8l-3 4 3 4v-2h5v5H9l3 3 3-3h-2v-5h5v2l3-4-3-4v2h-5V5h2l-3-3z" fill="#FFFFFF" stroke="${color}" stroke-width="1" stroke-linejoin="round"/></svg>`,
            resize: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M4 4L10 4L4 10L4 4ZM20 20L14 20L20 14L20 20Z" fill="#FFFFFF" stroke="${color}" stroke-width="1.5"/><path d="M4 4L20 20" stroke="#FFFFFF" stroke-width="3"/><path d="M4 4L20 20" stroke="${color}" stroke-width="1.5"/></svg>`,
        },
        dot: {
            default: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="2"/></svg>`,
            pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="2"/></svg>`,
            text: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><rect x="10" y="4" width="4" height="16" rx="2" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/></svg>`,
            crosshair: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/><circle cx="12" cy="12" r="8" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
            grab: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="12" r="3" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/><circle cx="16" cy="12" r="3" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/></svg>`,
            grabbing: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="12" rx="8" ry="4" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="2"/></svg>`,
            wait: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="20 10"/></svg>`,
            progress: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="20 10"/></svg>`,
            "not-allowed": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="none" stroke="#EF4444" stroke-width="3"/><path d="M6 18L18 6" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/></svg>`,
            move: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/><circle cx="12" cy="4" r="2" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/><circle cx="12" cy="20" r="2" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/><circle cx="4" cy="12" r="2" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/><circle cx="20" cy="12" r="2" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/></svg>`,
            resize: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="6" cy="6" r="4" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/><circle cx="18" cy="18" r="4" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/><path d="M8 8L16 16" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`,
        },
    };

    const styleSvgs = svgStrings[style] ?? svgStrings.mac;
    if (!styleSvgs) return null;

    const svg = styleSvgs[state];
    if (!svg) return null;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
