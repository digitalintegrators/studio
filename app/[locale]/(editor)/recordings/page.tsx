"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/navigation";
import { Icon } from "@iconify/react";
import {
  deleteRecordedVideoById,
  duplicateRecordedVideoById,
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

function getTotalDuration(recordings: RecordingLibraryItem[]): string {
  const total = recordings.reduce(
    (acc, recording) => acc + (recording.duration || 0),
    0
  );

  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);

  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

export default function RecordingsPage() {
  const router = useRouter();

  const [recordings, setRecordings] = useState<RecordingLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function loadRecordings() {
    setLoading(true);

    try {
      const items = await listRecordedVideos();
      setRecordings(items);
    } finally {
      setLoading(false);
    }
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

  const filteredRecordings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return recordings;

    return recordings.filter((recording) => {
      const title = `grabación ${recording.videoId.slice(-7)}`.toLowerCase();
      const date = formatDate(recording.timestamp).toLowerCase();

      return (
        title.includes(normalizedQuery) ||
        date.includes(normalizedQuery) ||
        recording.videoId.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, recordings]);

  async function openRecording(videoId: string) {
    setOpeningId(videoId);

    try {
      await setCurrentRecordedVideo(videoId);
      router.push("/editor");
    } finally {
      setOpeningId(null);
    }
  }

  async function duplicateRecording(videoId: string) {
    setDuplicatingId(videoId);

    try {
      const newVideoId = await duplicateRecordedVideoById(videoId);
      await setCurrentRecordedVideo(newVideoId);
      router.push("/editor");
    } catch (error) {
      console.error("Error al duplicar grabación:", error);
      window.alert("No se pudo duplicar la grabación.");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function deleteRecording(videoId: string) {
    const confirmDelete = window.confirm(
      "¿Seguro que quieres eliminar esta grabación? Esta acción no se puede deshacer."
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
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_28%),linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_20%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-28">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
              <Icon
                icon="material-symbols:video-library-outline-rounded"
                className="h-4 w-4"
                aria-hidden="true"
              />
              Studio Library
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
              Mis grabaciones
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400 md:text-base">
              Gestiona tus grabaciones locales, abre cualquier video en el
              editor, duplica versiones y mantén un flujo de trabajo más
              profesional.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadRecordings}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon
                icon="solar:refresh-bold"
                className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                aria-hidden="true"
              />
              Actualizar
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              <Icon
                icon="material-symbols:add-rounded"
                className="h-5 w-5"
                aria-hidden="true"
              />
              Nueva grabación
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <p className="text-sm text-neutral-400">Total grabaciones</p>
            <p className="mt-3 text-3xl font-semibold">{recordings.length}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <p className="text-sm text-neutral-400">Duración acumulada</p>
            <p className="mt-3 text-3xl font-semibold">
              {getTotalDuration(recordings)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <p className="text-sm text-neutral-400">Última grabación</p>
            <p className="mt-3 truncate text-3xl font-semibold">
              {recordings[0] ? formatDate(recordings[0].timestamp) : "—"}
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Icon
              icon="solar:magnifer-linear"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar grabación..."
              className="h-12 w-full rounded-full border border-white/10 bg-black/30 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-400/40 focus:bg-black/50"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Icon
              icon="solar:database-linear"
              className="h-4 w-4"
              aria-hidden="true"
            />
            Guardado local en este navegador
          </div>
        </section>

        {loading ? (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
              />
            ))}
          </section>
        ) : recordings.length === 0 ? (
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.04] p-10 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10 text-4xl">
              🎬
            </div>

            <h2 className="text-2xl font-semibold">
              Aún no tienes grabaciones
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-neutral-400">
              Graba tu pantalla y aparecerá aquí para abrirla nuevamente en el
              editor.
            </p>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              <Icon
                icon="material-symbols:radio-button-checked-rounded"
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
              Crear primera grabación
            </button>
          </section>
        ) : filteredRecordings.length === 0 ? (
          <section className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">
              No encontramos resultados
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-neutral-400">
              Prueba con otra fecha, nombre o identificador de grabación.
            </p>

            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-6 rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Limpiar búsqueda
            </button>
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRecordings.map((recording) => (
              <article
                key={recording.videoId}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.07]"
              >
                <button
                  type="button"
                  onClick={() => openRecording(recording.videoId)}
                  className="relative block aspect-video w-full overflow-hidden bg-black text-left"
                >
                  <video
                    src={recording.url}
                    className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
                    muted
                    playsInline
                    preload="metadata"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />

                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      {formatDuration(recording.duration)}
                    </span>

                    {recording.hasCamera ? (
                      <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-100 backdrop-blur">
                        Cámara
                      </span>
                    ) : null}
                  </div>

                  <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-xl transition group-hover:opacity-100">
                    <Icon
                      icon="solar:play-bold"
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                  </div>
                </button>

                <div className="flex flex-col gap-5 p-5">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="truncate text-base font-semibold">
                        Grabación {recording.videoId.slice(-7)}
                      </h2>

                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        Local
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-neutral-500">
                      {formatDate(recording.timestamp)}
                    </p>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <button
                      type="button"
                      disabled={openingId === recording.videoId}
                      onClick={() => openRecording(recording.videoId)}
                      className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {openingId === recording.videoId ? (
                        <Icon
                          icon="svg-spinners:ring-resize"
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Icon
                          icon="solar:clapperboard-edit-bold"
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                      Abrir
                    </button>

                    <button
                      type="button"
                      disabled={duplicatingId === recording.videoId}
                      onClick={() => duplicateRecording(recording.videoId)}
                      className="flex items-center justify-center rounded-full border border-cyan-400/30 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Duplicar grabación"
                      title="Duplicar grabación"
                    >
                      {duplicatingId === recording.videoId ? (
                        <Icon
                          icon="svg-spinners:ring-resize"
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Icon
                          icon="solar:copy-bold"
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === recording.videoId}
                      onClick={() => deleteRecording(recording.videoId)}
                      className="flex items-center justify-center rounded-full border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Eliminar grabación"
                      title="Eliminar grabación"
                    >
                      {deletingId === recording.videoId ? (
                        <Icon
                          icon="svg-spinners:ring-resize"
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Icon
                          icon="solar:trash-bin-trash-bold"
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
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