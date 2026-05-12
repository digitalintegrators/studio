import type { LibraryVideo } from "@/types";

export type LibraryVideoInfo = Omit<LibraryVideo, "blob">;

type ExtendedVideoForDetection = HTMLVideoElement & {
    mozHasAudio?: boolean;
    audioTracks?: { length: number };
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
};

const DB_NAME = "openvid-videos-library";
const DB_VERSION = 3;
const STORE_NAME = "uploaded-videos";

let dbInstance: IDBDatabase | null = null;

async function cleanupOldLibraryEntries(db: IDBDatabase): Promise<void> {
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - SIXTY_DAYS_MS;

    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);

            if (!store.indexNames.contains("uploadedAt")) {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => resolve();
                return;
            }

            const index = store.index("uploadedAt");
            const range = IDBKeyRange.upperBound(cutoff);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)
                    .result;

                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
}

function generateVideoId(): string {
    return `uploaded_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function normalizeLibraryVideo(video: LibraryVideo): LibraryVideo {
    const anyVideo = video as LibraryVideo & {
        uploadedAt?: number;
        createdAt?: number;
        updatedAt?: number;
        aspectRatio?: string;
    };

    const createdAt = anyVideo.createdAt ?? anyVideo.uploadedAt ?? Date.now();

    return {
        ...video,
        createdAt,
        updatedAt: anyVideo.updatedAt ?? createdAt,
    };
}

async function openDB(): Promise<IDBDatabase> {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            dbInstance = request.result;
            cleanupOldLibraryEntries(dbInstance).catch(() => {});
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                });

                store.createIndex("uploadedAt", "uploadedAt", { unique: false });
                store.createIndex("createdAt", "createdAt", { unique: false });
                store.createIndex("updatedAt", "updatedAt", { unique: false });
                return;
            }

            const transaction = (event.target as IDBOpenDBRequest).transaction;
            const store = transaction?.objectStore(STORE_NAME);

            if (store) {
                if (!store.indexNames.contains("uploadedAt")) {
                    store.createIndex("uploadedAt", "uploadedAt", { unique: false });
                }

                if (!store.indexNames.contains("createdAt")) {
                    store.createIndex("createdAt", "createdAt", { unique: false });
                }

                if (!store.indexNames.contains("updatedAt")) {
                    store.createIndex("updatedAt", "updatedAt", { unique: false });
                }
            }
        };
    });
}

export async function findExistingVideo(
    fileName: string,
    fileSize: number
): Promise<LibraryVideo | null> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();

        request.onerror = () => reject(request.error);

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)
                .result;

            if (cursor) {
                const video = normalizeLibraryVideo(cursor.value as LibraryVideo);

                if (video.fileName === fileName && video.fileSize === fileSize) {
                    resolve(video);
                    return;
                }

                cursor.continue();
            } else {
                resolve(null);
            }
        };
    });
}

async function getVideoMetadata(file: Blob): Promise<{
    duration: number;
    width: number;
    height: number;
}> {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        const url = URL.createObjectURL(file);

        video.preload = "metadata";

        video.onloadedmetadata = () => {
            const metadata = {
                duration: Number.isFinite(video.duration) ? video.duration : 0,
                width: video.videoWidth || 1920,
                height: video.videoHeight || 1080,
            };

            URL.revokeObjectURL(url);
            resolve(metadata);
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load video metadata"));
        };

        video.src = url;
    });
}

async function generateThumbnail(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        const url = URL.createObjectURL(blob);

        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;

        video.onloadeddata = () => {
            const seekTime =
                Number.isFinite(video.duration) && video.duration > 0
                    ? video.duration * 0.1
                    : 0;

            video.currentTime = seekTime;
        };

        video.onseeked = () => {
            const canvas = document.createElement("canvas");
            const safeWidth = video.videoWidth || 160;
            const safeHeight = video.videoHeight || 90;
            const aspectRatio = safeWidth / safeHeight;

            canvas.width = 320;
            canvas.height = Math.round(320 / aspectRatio);

            const ctx = canvas.getContext("2d");

            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error("Failed to get canvas context"));
                return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.72);

            URL.revokeObjectURL(url);
            resolve(thumbnailUrl);
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load video for thumbnail"));
        };

        video.src = url;
    });
}

export async function detectVideoHasAudio(blob: Blob): Promise<boolean> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(blob);
        const video = document.createElement("video") as ExtendedVideoForDetection;

        video.muted = true;
        video.preload = "metadata";

        let settled = false;

        const cleanup = (result: boolean) => {
            if (settled) return;

            settled = true;
            clearTimeout(timeoutId);
            URL.revokeObjectURL(url);
            video.src = "";
            resolve(result);
        };

        const timeoutId = window.setTimeout(() => cleanup(false), 8000);

        video.addEventListener("loadedmetadata", async () => {
            if (typeof video.mozHasAudio === "boolean") {
                cleanup(video.mozHasAudio);
                return;
            }

            if (video.audioTracks && video.audioTracks.length > 0) {
                cleanup(true);
                return;
            }

            const captureMethod = video.captureStream ?? video.mozCaptureStream;

            if (captureMethod) {
                try {
                    const stream = captureMethod.call(video);

                    if (stream.getAudioTracks().length > 0) {
                        stream.getTracks().forEach((track) => track.stop());
                        cleanup(true);
                        return;
                    }

                    stream.getTracks().forEach((track) => track.stop());
                } catch {
                    // continue to fallback
                }
            }

            const MAX_DEEP_SCAN_SIZE = 50 * 1024 * 1024;

            if (blob.size <= MAX_DEEP_SCAN_SIZE) {
                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const AudioContextClass =
                        window.OfflineAudioContext ||
                        (
                            window as Window & {
                                webkitOfflineAudioContext?: typeof OfflineAudioContext;
                            }
                        ).webkitOfflineAudioContext;

                    if (AudioContextClass) {
                        const audioCtx = new AudioContextClass(1, 1, 44100);
                        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                        cleanup(audioBuffer.numberOfChannels > 0);
                        return;
                    }
                } catch {
                    // decodeAudioData often fails for full video containers; ignore
                }
            }

            cleanup(blob.size > MAX_DEEP_SCAN_SIZE);
        });

        video.addEventListener("error", () => cleanup(false));

        video.src = url;
    });
}

export async function addVideoToLibrary(file: File): Promise<LibraryVideo> {
    const db = await openDB();
    const metadata = await getVideoMetadata(file);

    let thumbnailUrl: string | undefined;

    try {
        thumbnailUrl = await generateThumbnail(file);
    } catch (error) {
        console.warn("Failed to generate thumbnail:", error);
    }

    let hasAudio = false;

    try {
        hasAudio = await detectVideoHasAudio(file);
    } catch (error) {
        console.warn("Failed to detect audio:", error);
    }

    const now = Date.now();

    const video: LibraryVideo = {
        id: generateVideoId(),
        blob: file,
        fileName: file.name,
        fileSize: file.size,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        thumbnailUrl,
        createdAt: now,
        updatedAt: now,
        hasAudio,
        originalHasAudio: hasAudio,
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add({
            ...video,
            uploadedAt: now,
        });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(video);
    });
}

export interface AddVideoWithMetadataOptions {
    blob: Blob;
    fileName: string;
    duration: number;
    width: number;
    height: number;
    hasAudio?: boolean;
}

export async function addVideoToLibraryWithMetadata(
    options: AddVideoWithMetadataOptions
): Promise<LibraryVideo> {
    const db = await openDB();

    let thumbnailUrl: string | undefined;

    try {
        thumbnailUrl = await generateThumbnail(options.blob);
    } catch (error) {
        console.warn("Failed to generate thumbnail:", error);
    }

    let hasAudio = options.hasAudio;

    if (hasAudio === undefined) {
        try {
            hasAudio = await detectVideoHasAudio(options.blob);
        } catch (error) {
            console.warn("Failed to detect audio:", error);
            hasAudio = false;
        }
    }

    const now = Date.now();

    const video: LibraryVideo = {
        id: generateVideoId(),
        blob: options.blob,
        fileName: options.fileName,
        fileSize: options.blob.size,
        duration: options.duration,
        width: options.width,
        height: options.height,
        thumbnailUrl,
        createdAt: now,
        updatedAt: now,
        hasAudio,
        originalHasAudio: hasAudio,
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add({
            ...video,
            uploadedAt: now,
        });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(video);
    });
}

export async function getAllLibraryVideos(): Promise<LibraryVideo[]> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);

        const videos: LibraryVideo[] = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)
                .result;

            if (cursor) {
                videos.push(normalizeLibraryVideo(cursor.value as LibraryVideo));
                cursor.continue();
            } else {
                resolve(videos.sort((a, b) => b.createdAt - a.createdAt));
            }
        };

        request.onerror = () => reject(request.error);
    });
}

export async function getLibraryVideoInfoList(): Promise<LibraryVideoInfo[]> {
    const videos = await getAllLibraryVideos();

    return videos.map(({ blob: _blob, ...info }) => info);
}

export async function getLibraryVideo(id: string): Promise<LibraryVideo | null> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            if (!request.result) {
                resolve(null);
                return;
            }

            resolve(normalizeLibraryVideo(request.result as LibraryVideo));
        };
    });
}

export async function deleteLibraryVideo(id: string): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function updateVideoAudioState(
    id: string,
    hasAudio: boolean
): Promise<void> {
    const db = await openDB();
    const video = await getLibraryVideo(id);

    if (!video) {
        throw new Error(`Video with id ${id} not found`);
    }

    const updatedVideo: LibraryVideo = {
        ...video,
        hasAudio,
        updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({
            ...updatedVideo,
            uploadedAt: updatedVideo.createdAt,
        });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function clearLibrary(): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function getLibraryVideoCount(): Promise<number> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.count();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatVideoDuration(seconds: number): string {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const mins = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
}