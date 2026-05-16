"use client";

import { Icon } from "@iconify/react";
import type { CaptionSegment, CaptionSettings } from "@/types/caption.types";

type CaptionsMenuProps = {
  segments: CaptionSegment[];
  settings: CaptionSettings;
  selectedSegmentId?: string | null;
  videoDuration?: number;
  onSettingsChange: (updates: Partial<CaptionSettings>) => void;
  onAddDemoCaptions: () => void;
  onSelectSegment: (segmentId: string | null) => void;
  onUpdateSegment: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  onDeleteSegment: (segmentId: string) => void;
};

const presetLabels: Array<{ value: CaptionSettings["preset"]; label: string; description: string }> = [
  { value: "minimal", label: "Mínimo", description: "Texto limpio con sombra suave." },
  { value: "cinematic", label: "Cinemático", description: "Glow sutil y presencia premium." },
  { value: "bold", label: "Intenso", description: "Mayor contraste para demos rápidas." },
  { value: "creator", label: "Creador", description: "Estilo social con más energía visual." },
];

export function CaptionsMenu({
  segments,
  settings,
  selectedSegmentId = null,
  videoDuration = 0,
  onSettingsChange,
  onAddDemoCaptions,
  onSelectSegment,
  onUpdateSegment,
  onDeleteSegment,
}: CaptionsMenuProps) {
  const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId) ?? null;

  return (
    <div className="flex h-full flex-col text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.16)]">
            <Icon icon="solar:subtitles-bold" width="22" />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-[-0.02em]">Subtítulos</h2>
            <p className="text-xs text-white/45">Estilo, posición y segmentos visibles.</p>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Mostrar subtítulos</div>
              <div className="text-xs text-white/45">Preview y exportación final.</div>
            </div>

            <button
              type="button"
              onClick={() => onSettingsChange({ enabled: !settings.enabled })}
              className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                settings.enabled ? "bg-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.35)]" : "bg-white/15"
              }`}
              aria-pressed={settings.enabled}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                  settings.enabled ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="mb-4 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.06] px-3 py-3 text-xs leading-relaxed text-white/55">
            Los subtítulos locales se generan durante la grabación cuando el navegador soporta reconocimiento de voz y el micrófono está activo. No usa OpenAI ni servicios externos.
          </div>

          <div className="grid grid-cols-2 gap-2">
            {presetLabels.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => onSettingsChange({ preset: preset.value })}
                className={`rounded-2xl border p-3 text-left transition ${
                  settings.preset === preset.value
                    ? "border-cyan-300/70 bg-cyan-400/15 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                    : "border-white/10 bg-black/20 text-white/70 hover:border-white/20 hover:bg-white/[0.06]"
                }`}
              >
                <div className="text-sm font-bold">{preset.label}</div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/45">{preset.description}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <SliderRow
            label="Posición vertical"
            value={settings.positionY}
            min={55}
            max={92}
            suffix="%"
            onChange={(value) => onSettingsChange({ positionY: value })}
          />

          <SliderRow
            label="Tamaño"
            value={settings.fontSize}
            min={24}
            max={72}
            suffix="px"
            onChange={(value) => onSettingsChange({ fontSize: value })}
          />

          <SliderRow
            label="Ancho máximo"
            value={settings.maxWidth}
            min={40}
            max={92}
            suffix="%"
            onChange={(value) => onSettingsChange({ maxWidth: value })}
          />

          <SliderRow
            label="Fondo"
            value={Math.round(settings.backgroundOpacity * 100)}
            min={0}
            max={80}
            suffix="%"
            onChange={(value) => onSettingsChange({ backgroundOpacity: value / 100 })}
          />

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
            <div>
              <div className="text-sm font-semibold">Resaltar palabras</div>
              <div className="text-xs text-white/40">Preparado para timing por palabra.</div>
            </div>
            <button
              type="button"
              onClick={() => onSettingsChange({ showWordHighlight: !settings.showWordHighlight })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                settings.showWordHighlight ? "bg-cyan-400" : "bg-white/15"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  settings.showWordHighlight ? "left-6" : "left-1"
                }`}
              />
            </button>
          </label>
        </section>


        <section className="space-y-4 rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white">Sincronía</div>
              <div className="mt-1 text-xs leading-relaxed text-white/45">
                Adelanta o retrasa los subtítulos para alinearlos con el audio del video.
              </div>
            </div>

            <div className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {(settings.offsetSeconds ?? 0) > 0 ? "+" : ""}{(settings.offsetSeconds ?? 0).toFixed(1)}s
            </div>
          </div>

          <SliderRow
            label="Desplazamiento"
            value={Math.round((settings.offsetSeconds ?? 0) * 10)}
            min={-30}
            max={30}
            suffix=""
            onChange={(value) => onSettingsChange({ offsetSeconds: value / 10 })}
          />

          <div className="flex items-center justify-between text-[11px] text-white/40">
            <span>Aparecen antes</span>
            <span>Aparecen después</span>
          </div>

          <button
            type="button"
            onClick={() => onSettingsChange({ offsetSeconds: 0 })}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/65 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-100"
          >
            Restablecer sincronía
          </button>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Segmentos</div>
              <div className="text-xs text-white/45">{segments.length} subtítulo{segments.length === 1 ? "" : "s"}</div>
            </div>

            <button
              type="button"
              onClick={onAddDemoCaptions}
              className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Demo
            </button>
          </div>

          {segments.length > 0 ? (
            <div className="space-y-2">
              {segments.map((segment) => (
                <button
                  key={segment.id}
                  type="button"
                  onClick={() => onSelectSegment(segment.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    selectedSegmentId === segment.id
                      ? "border-cyan-300/70 bg-cyan-400/12"
                      : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="line-clamp-2 text-sm font-semibold text-white">{segment.text}</div>
                  <div className="mt-1 text-[11px] text-white/40">
                    {segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-4 text-sm text-white/45">
              No hay subtítulos todavía. Graba con micrófono activo para generar subtítulos locales o usa Demo para probar estilos.
            </div>
          )}
        </section>

        {selectedSegment && (
          <section className="space-y-3 rounded-3xl border border-cyan-300/20 bg-cyan-400/[0.06] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold">Editar segmento</div>
                <div className="text-xs text-white/45">Ajusta texto e intervalo.</div>
              </div>

              <button
                type="button"
                onClick={() => onSelectSegment(null)}
                className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar segmento"
              >
                <Icon icon="solar:close-circle-bold" width="18" />
              </button>
            </div>

            <textarea
              value={selectedSegment.text}
              onChange={(event) => onUpdateSegment(selectedSegment.id, { text: event.target.value })}
              className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
            />

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] text-white/45">Inicio</span>
                <input
                  type="number"
                  min={0}
                  max={videoDuration}
                  step={0.1}
                  value={Number(selectedSegment.startTime.toFixed(1))}
                  onChange={(event) => onUpdateSegment(selectedSegment.id, { startTime: Number(event.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-white/45">Fin</span>
                <input
                  type="number"
                  min={0}
                  max={videoDuration}
                  step={0.1}
                  value={Number(selectedSegment.endTime.toFixed(1))}
                  onChange={(event) => onUpdateSegment(selectedSegment.id, { endTime: Number(event.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/50"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => onDeleteSegment(selectedSegment.id)}
              className="w-full rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/25"
            >
              Eliminar segmento
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white/70">{label}</span>
        <span className="rounded-lg bg-white/8 px-2 py-1 text-[11px] font-semibold text-white/55">
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan-300"
      />
    </label>
  );
}
