"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import Atropos from "atropos";

const featurePills = ["Spotlight", "Máscara", "Zoom", "Audio", "Export"];

export default function EditorPreview({ compact = false }: { compact?: boolean } = {}) {
  const atroposRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!atroposRef.current) return;

    const instance = Atropos({
      el: atroposRef.current,
      activeOffset: 26,
      shadow: false,
      highlight: true,
    });

    return () => instance.destroy();
  }, []);

  return (
    <section id="preview" className={`${compact ? "relative mx-auto max-w-[1420px] isolate" : "relative mx-auto mt-12 max-w-6xl isolate"}`}>
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-96 w-[78%] -translate-x-1/2 rounded-full bg-[#3c83f6]/22 blur-[150px]" />
      <div className="pointer-events-none absolute right-0 top-40 -z-10 h-80 w-80 rounded-full bg-violet-500/15 blur-[120px]" />

      {!compact && (
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#9bdcff] shadow-[0_0_34px_rgba(60,131,246,0.16)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7df0f8] shadow-[0_0_16px_rgba(125,240,248,0.85)]" />
            Product workspace
          </span>

          <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">
            Diseñado para que el editor se vea tan bien como el resultado.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/50">
            Todo el producto respira la misma estética: vidrio, profundidad, movimiento suave y controles enfocados en explicar mejor.
          </p>
        </div>
      )}

      <div ref={atroposRef} className="atropos w-full rounded-[2.75rem]">
        <div className="atropos-scale">
          <div className="atropos-rotate">
            <div className="atropos-inner rounded-[2.25rem]">
              <div className="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-[#050914] p-2 shadow-[0_54px_190px_rgba(0,0,0,0.78)]" data-atropos-offset="2">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(60,131,246,0.24),transparent_42%),radial-gradient(circle_at_90%_20%,rgba(168,85,247,0.12),transparent_28%)]" />

                <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#07101d]">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.025] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-400/80" />
                      <span className="h-3 w-3 rounded-full bg-amber-300/80" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                    </div>
                    <div className="hidden rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-semibold text-white/45 sm:block">
                      studio.laboratorios.digital/editor
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-xl border border-white/10 bg-white/[0.04]" />
                      <div className="h-7 w-16 rounded-xl border border-[#3c83f6]/25 bg-[#3c83f6]/10" />
                    </div>
                  </div>

                  <div className="grid min-h-[440px] lg:grid-cols-[74px_minmax(0,1fr)_282px]">
                    <aside className="hidden border-r border-white/10 bg-black/20 p-3 lg:block">
                      {["solar:scissors-bold", "solar:magic-stick-3-bold", "solar:mask-happly-bold", "solar:cursor-bold", "solar:palette-bold"].map((icon, index) => (
                        <div
                          key={icon}
                          className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border ${
                            index === 1
                              ? "border-[#7df0f8]/35 bg-[#3c83f6]/15 text-[#bfeeff] shadow-[0_0_35px_rgba(60,131,246,0.22)]"
                              : "border-white/10 bg-white/[0.04] text-white/42"
                          }`}
                          data-atropos-offset={index === 1 ? "8" : "3"}
                        >
                          <Icon icon={icon} className="h-5 w-5" />
                        </div>
                      ))}
                    </aside>

                    <main className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(60,131,246,0.18),transparent_36%),#05070d] p-5 sm:p-8">
                      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:24px_24px]" />

                      <div className="relative mx-auto flex aspect-video max-w-3xl items-center justify-center rounded-[1.9rem] border border-white/10 bg-[#101828] p-5 shadow-[0_36px_90px_rgba(0,0,0,0.48)]" data-atropos-offset="8">
                        <div className="absolute inset-5 rounded-[1.3rem] bg-[linear-gradient(135deg,#121b2d,#020617)]" />
                        <div className="absolute left-[16%] top-[19%] h-[19%] w-[44%] rounded-2xl bg-white/9" />
                        <div className="absolute left-[16%] top-[48%] h-[8%] w-[66%] rounded-full bg-white/7" />
                        <div className="absolute left-[16%] top-[62%] h-[8%] w-[48%] rounded-full bg-white/6" />
                        <div className="absolute left-[13%] top-[14%] h-[35%] w-[58%] rounded-[1.35rem] border border-amber-300/80 bg-transparent shadow-[0_0_0_999px_rgba(0,0,0,0.48),0_0_80px_rgba(251,191,36,0.22)]" />
                        <div className="absolute bottom-5 right-5 h-20 w-20 overflow-hidden rounded-full border border-white/20 bg-[#111827] shadow-2xl">
                          <div className="h-full w-full bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.22),transparent_25%),linear-gradient(135deg,#334155,#020617)]" />
                        </div>
                      </div>
                    </main>

                    <aside className="hidden border-l border-white/10 bg-white/[0.025] p-4 lg:block">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/70">Inspector</span>
                        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-200">Spotlight</span>
                      </div>

                      <div className="space-y-3">
                        {[
                          ["X", "28%", "w-[44%]"],
                          ["Y", "19%", "w-[34%]"],
                          ["Width", "58%", "w-[72%]"],
                          ["Feather", "24px", "w-[56%]"],
                        ].map(([label, value, width]) => (
                          <div key={label}>
                            <div className="mb-1 flex justify-between text-[11px] text-white/45">
                              <span>{label}</span>
                              <span>{value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/10">
                              <div className={`h-full ${width} rounded-full bg-gradient-to-r from-[#3c83f6] to-[#7df0f8]`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </aside>
                  </div>

                  <div className="border-t border-white/10 bg-[#070a12] p-3">
                    <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center">
                      <div className="flex items-center gap-2">
                        {featurePills.slice(0, 2).map((pill) => (
                          <span key={pill} className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/45 sm:inline-flex">
                            {pill}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-center gap-3">
                        <div className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04]" />
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-[0_0_44px_rgba(255,255,255,0.24)]">
                          <Icon icon="solar:play-bold" className="h-5 w-5" />
                        </div>
                        <div className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04]" />
                      </div>

                      <div className="flex justify-end gap-2">
                        {featurePills.slice(2).map((pill) => (
                          <span key={pill} className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/45 sm:inline-flex">
                            {pill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex h-10 overflow-hidden rounded-xl border border-emerald-400/25 bg-emerald-400/10">
                        {Array.from({ length: 18 }).map((_, index) => (
                          <div key={index} className="flex-1 border-r border-black/20 bg-gradient-to-b from-white/10 to-transparent" />
                        ))}
                      </div>

                      <div className="relative h-8 rounded-xl border border-white/10 bg-white/[0.035]">
                        <div className="absolute left-[18%] top-1 h-6 w-[18%] rounded-lg border border-amber-300/50 bg-amber-300/20 text-center text-[10px] font-bold leading-6 text-amber-100">Spot</div>
                        <div className="absolute left-[47%] top-1 h-6 w-[21%] rounded-lg border border-violet-300/50 bg-violet-300/20 text-center text-[10px] font-bold leading-6 text-violet-100">Mask</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
