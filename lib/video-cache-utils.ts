import { getUploadedVideo } from "./video-upload-cache";

async function hasRecordedVideo(): Promise<boolean> {
    try {
        const dbName = "openvidDB";
        const storeName = "videos";

        return new Promise((resolve) => {
            const request = indexedDB.open(dbName);

            request.onsuccess = () => {
                const db = request.result;
                
                if (!db.objectStoreNames.contains(storeName)) {
                    db.close();
                    resolve(false);
                    return;
                }

                const transaction = db.transaction([storeName], "readonly");
                const store = transaction.objectStore(storeName);
                const getRequest = store.get("currentVideo");

                getRequest.onsuccess = () => {
                    db.close();
                    resolve(!!getRequest.result);
                };

                getRequest.onerror = () => {
                    db.close();
                    resolve(false);
                };
            };

            request.onerror = () => {
                resolve(false);
            };
        });
    } catch (error) {
        console.error("Error checking recorded video:", error);
        return false;
    }
}

export async function hasAnyVideo(): Promise<boolean> {
    try {
        const uploadedVideo = await getUploadedVideo();
        if (uploadedVideo) return true;

        return await hasRecordedVideo();
    } catch (error) {
        console.error("Error checking for any video:", error);
        return false;
    }
}
