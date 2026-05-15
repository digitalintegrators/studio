"use client";

import { useEffect, useRef } from "react";
import Atropos from "atropos";

export default function EditorPreview() {
  const atroposRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!atroposRef.current) return;

    const instance = Atropos({
      el: atroposRef.current,
      activeOffset: 34,
      shadow: false,
      highlight: true,
    });

    return () => instance.destroy();
  }, []);

  return (
    <div className="relative mx-auto mt-10 max-w-6xl isolate">
      <div className="pointer-events-none absolute left-1/2 top-8 -z-10 h-80 w-[70%] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[130px]" />

      <div className="mb-10 text-center">
        <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-100">
          Product preview
        </span>
        <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">
          Un editor que se siente rápido, claro y premium.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/50">
          Timeline visual, controles limpios, efectos por fragmento y una experiencia pensada para crear contenido técnico sin fricción.
        </p>
      </div>

      <div ref={atroposRef} className="atropos w-full rounded-[2rem]">
        <div className="atropos-scale">
          <div className="atropos-rotate">
            <div className="atropos-inner rounded-[2rem]">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#070a12] p-2 shadow-[0_30px_140px_rgba(0,0,0,0.6)]" data-atropos-offset="2">
                <img
                  src="/images/pages/openvid2.webp"
                  alt="Studio editor preview"
                  className="h-auto w-full rounded-[1.45rem] object-cover"
                  loading="lazy"
                  data-atropos-offset="4"
                />
                <div className="pointer-events-none absolute inset-2 rounded-[1.45rem] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_35%,rgba(34,211,238,0.12))]" data-atropos-offset="6" />
                <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs font-bold text-white/65 backdrop-blur-xl sm:block" data-atropos-offset="9">
                  Spotlight · Mask · Zoom · Export
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
