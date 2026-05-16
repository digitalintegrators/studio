import type { CaptionSegment } from "@/types/caption.types";

export type RecordingLibraryItem = {
  videoId: string;
  duration: number;
  timestamp: number;
  url: string;
  thumbnailUrl?: string | null;
  isRecordedVideo?: boolean;
  hasCamera?: boolean;
  localCaptions?: CaptionSegment[] | null;
};

const DB_NAME = "openvidDB";
const VIDEO_STORE_NAME = "videos";
const DB_VERSION = 3;

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) {
        db.createObjectStore(VIDEO_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);

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

function generateVideoId(): string {
  return `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function listRecordedVideos(): Promise<RecordingLibraryItem[]> {
  try {
    const db = await getDB();

    if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) {
      db.close();
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE_NAME], "readonly");
      const store = transaction.objectStore(VIDEO_STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result.filter((key) => key !== "currentVideo");

        if (keys.length === 0) {
          db.close();
          resolve([]);
          return;
        }

        const items: RecordingLibraryItem[] = [];
        let pending = keys.length;

        keys.forEach((key) => {
          const getRequest = store.get(key);

          getRequest.onsuccess = () => {
            const data = getRequest.result;

            if (data?.blob) {
              const videoId =
                data.videoId ||
                (typeof key === "string" ? key : `vid_${String(key)}`);

              items.push({
                videoId,
                duration: data.duration ?? 0,
                timestamp: data.timestamp ?? Date.now(),
                url: URL.createObjectURL(data.blob),
                isRecordedVideo: data.isRecordedVideo ?? true,
                hasCamera: Boolean(data.cameraBlob),
                localCaptions: Array.isArray(data.localCaptions) ? data.localCaptions : null,
              });
            }

            pending -= 1;

            if (pending === 0) {
              db.close();
              resolve(items.sort((a, b) => b.timestamp - a.timestamp));
            }
          };

          getRequest.onerror = () => {
            pending -= 1;

            if (pending === 0) {
              db.close();
              resolve(items.sort((a, b) => b.timestamp - a.timestamp));
            }
          };
        });
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error al listar grabaciones:", error);
    return [];
  }
}

export async function setCurrentRecordedVideo(videoId: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VIDEO_STORE_NAME], "readwrite");
    const store = transaction.objectStore(VIDEO_STORE_NAME);

    store.put(
      {
        videoId,
        timestamp: Date.now(),
      },
      "currentVideo"
    );

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

export async function deleteRecordedVideoById(videoId: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VIDEO_STORE_NAME], "readwrite");
    const store = transaction.objectStore(VIDEO_STORE_NAME);

    store.delete(videoId);

    const currentRequest = store.get("currentVideo");

    currentRequest.onsuccess = () => {
      const current = currentRequest.result;

      const currentVideoId =
        typeof current === "string" ? current : current?.videoId;

      if (currentVideoId === videoId) {
        store.delete("currentVideo");
      }
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

export async function duplicateRecordedVideoById(
  videoId: string
): Promise<string> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VIDEO_STORE_NAME], "readwrite");
    const store = transaction.objectStore(VIDEO_STORE_NAME);

    const getRequest = store.get(videoId);

    let newVideoId: string | null = null;

    getRequest.onsuccess = () => {
      const original = getRequest.result;

      if (!original?.blob) {
        transaction.abort();
        reject(new Error("No se encontró la grabación para duplicar."));
        return;
      }

      newVideoId = generateVideoId();

      const duplicated = {
        ...original,
        videoId: newVideoId,
        timestamp: Date.now(),
        duplicatedFrom: videoId,
      };

      store.put(duplicated, newVideoId);
      store.put(
        {
          videoId: newVideoId,
          timestamp: duplicated.timestamp,
        },
        "currentVideo"
      );
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };

    transaction.oncomplete = () => {
      db.close();

      if (newVideoId) {
        resolve(newVideoId);
      } else {
        reject(new Error("No se pudo duplicar la grabación."));
      }
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

export async function getCurrentRecordedVideoId(): Promise<string | null> {
  const db = await getDB();

  return new Promise((resolve) => {
    const transaction = db.transaction([VIDEO_STORE_NAME], "readonly");
    const store = transaction.objectStore(VIDEO_STORE_NAME);
    const request = store.get("currentVideo");

    request.onsuccess = () => {
      db.close();

      const current = request.result;

      if (!current) {
        resolve(null);
        return;
      }

      if (typeof current === "string") {
        resolve(current);
        return;
      }

      if (current.videoId) {
        resolve(current.videoId);
        return;
      }

      if (current.blob && current.videoId) {
        resolve(current.videoId);
        return;
      }

      resolve(null);
    };

    request.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}
