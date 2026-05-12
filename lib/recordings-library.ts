export type RecordingLibraryItem = {
  videoId: string;
  duration: number;
  timestamp: number;
  url: string;
  thumbnailUrl?: string | null;
  isRecordedVideo?: boolean;
  hasCamera?: boolean;
};

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const dbName = "openvidDB";
    const storeName = "videos";
    const version = 2;

    const request = indexedDB.open(dbName, version);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateVideoId(): string {
  return `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function listRecordedVideos(): Promise<RecordingLibraryItem[]> {
  try {
    const db = await getDB();
    const storeName = "videos";

    if (!db.objectStoreNames.contains(storeName)) {
      db.close();
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
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

            if (data?.blob && data?.videoId) {
              items.push({
                videoId: data.videoId,
                duration: data.duration ?? 0,
                timestamp: data.timestamp ?? Date.now(),
                url: URL.createObjectURL(data.blob),
                isRecordedVideo: data.isRecordedVideo ?? true,
                hasCamera: Boolean(data.cameraBlob),
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
    const transaction = db.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");

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
  });
}

export async function deleteRecordedVideoById(videoId: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");

    store.delete(videoId);

    const currentRequest = store.get("currentVideo");

    currentRequest.onsuccess = () => {
      const current = currentRequest.result;

      if (current?.videoId === videoId) {
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
  });
}

export async function duplicateRecordedVideoById(
  videoId: string
): Promise<string> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");

    const getRequest = store.get(videoId);

    getRequest.onsuccess = () => {
      const original = getRequest.result;

      if (!original?.blob) {
        reject(new Error("No se encontró la grabación para duplicar."));
        return;
      }

      const newVideoId = generateVideoId();

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

      resolve(newVideoId);
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function getCurrentRecordedVideoId(): Promise<string | null> {
  const db = await getDB();

  return new Promise((resolve) => {
    const transaction = db.transaction(["videos"], "readonly");
    const store = transaction.objectStore("videos");
    const request = store.get("currentVideo");

    request.onsuccess = () => {
      db.close();

      const current = request.result;

      if (!current) {
        resolve(null);
        return;
      }

      resolve(typeof current === "string" ? current : current.videoId ?? null);
    };

    request.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}