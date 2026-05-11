"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/navigation";
import {
  deleteRecordedVideoById,
  listRecordedVideos,
  setCurrentRecordedVideo,
  type RecordingLibraryItem,
} from "@/lib/recordings-library";

function formatDuration(seconds: number): string {
  const totalSeconds = Math.floor(seconds || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function RecordingsPage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<RecordingLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadRecordings() {
    setLoading(true);
    const items = await listRecordedVideos();
    setRecordings(items);
    setLoading(false);
  }

  useEffect(() => {
    loadRecordings();

    return () => {
      recordings.forEach((recording) => {
        URL.revokeObjectURL(recording.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openRecording(videoId: string) {
    await setCurrentRecordedVideo(videoId);
    router.push("/editor");
  }

  async function deleteRecording(videoId: string) {
    const confirmDelete = window.confirm(
      "¿Seguro que quieres eliminar esta grabación?"
    );

    if (!confirmDelete) return;

    setDeletingId(videoId);

    try {
      await deleteRecordedVideoById(videoId);
      await loadRecordings();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
              Studio
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">
              Mis grabaciones
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-neutral-400 md:text-base">
              Biblioteca local de grabaciones guardadas en este navegador.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-neutral-200"
          >
            Nueva grabación
          </button>
        </header>

        {loading ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <p className="text-sm text-neutral-400">Cargando grabaciones...</p>
          </section>
        ) : recordings.length === 0 ? (
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl">
              🎬
            </div>
            <h2 className="text-2xl font-semibold">Aún no tienes grabaciones</h2>
            <p className="mt-3 max-w-md text-sm text-neutral-400">
              Graba tu pantalla y aparecerá aquí para abrirla nuevamente en el
              editor.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-neutral-200"
            >
              Crear primera grabación
            </button>
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {recordings.map((recording) => (
              <article
                key={recording.videoId}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/20 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <button
                  type="button"
                  onClick={() => openRecording(recording.videoId)}
                  className="block aspect-video w-full overflow-hidden bg-black text-left"
                >
                  <video
                    src={recording.url}
                    className="h-full w-full object-cover opacity-90 transition group-hover:scale-[1.02] group-hover:opacity-100"
                    muted
                    playsInline
                    preload="metadata"
                  />
                </button>

                <div className="flex flex-col gap-4 p-5">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="truncate text-base font-semibold">
                        Grabación {recording.videoId.slice(-7)}
                      </h2>

                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-neutral-300">
                        {formatDuration(recording.duration)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-neutral-500">
                      {formatDate(recording.timestamp)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                        Pantalla
                      </span>

                      {recording.hasCamera ? (
                        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                          Cámara
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openRecording(recording.videoId)}
                      className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200"
                    >
                      Abrir editor
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === recording.videoId}
                      onClick={() => deleteRecording(recording.videoId)}
                      className="rounded-full border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === recording.videoId ? "..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}