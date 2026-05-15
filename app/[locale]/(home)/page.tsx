import { StructuredData, generateOrganizationSchema, generateWebAppSchema } from "@/app/components/seo/StructuredData";
import { CarouselDemos } from "@/app/components/ui/CarouselDemos";
import EditorPreview from "@/app/components/ui/EditorPreview";
import Hero from "@/app/components/ui/Hero";
import InteractiveRecordingSteps from "@/app/components/ui/RecordingSteps";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = "https://studio.laboratorios.digital";

  const metadata = {
    es: {
      title: "Studio — Crea demos profesionales con edición cinematográfica",
      description:
        "Graba pantalla, cámara, micrófono y audio del sistema. Edita demos con timeline, spotlight, máscaras, zooms y exportación profesional.",
      keywords: ["editor de video", "grabar pantalla", "demos profesionales", "screen recorder", "video editor online", "spotlight", "zoom video"],
    },
    en: {
      title: "Studio — Create cinematic product demos in your browser",
      description:
        "Record screen, camera, microphone and system audio. Edit demos with timeline, spotlight, masks, zooms and professional export.",
      keywords: ["video editor", "screen recorder", "professional demos", "online video editor", "spotlight", "video zoom"],
    },
  };

  const { title, description, keywords } = metadata[locale as "es" | "en"] || metadata.es;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        es: `${baseUrl}/es`,
        en: `${baseUrl}/en`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${locale}`,
      images: [
        {
          url: `${baseUrl}/images/metadata/preview.jpg`,
          width: 1200,
          height: 630,
          alt: "Studio - Video Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/images/metadata/preview.jpg`],
    },
  };
}

function FeatureGrid() {
  const features = [
    { title: "Timeline premium", description: "Thumbnails, waveform y fragmentos visuales para editar rápido.", icon: "⌁" },
    { title: "Spotlight & máscaras", description: "Resalta palabras, zonas o elementos clave del video.", icon: "◉" },
    { title: "Zoom cinematográfico", description: "Prepara demos más claras con movimientos suaves y foco visual.", icon: "⌕" },
    { title: "Grabación completa", description: "Pantalla, cámara, micrófono y audio del sistema desde navegador.", icon: "●" },
  ];

  return (
    <section id="features" className="relative w-full py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
            Editor visual
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            Todo lo que necesitas para una demo pulida.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/55">
            Una experiencia optimizada para explicar productos, bugs, capacitaciones, PoCs y flujos técnicos sin herramientas pesadas.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.055]">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-300/15 to-violet-300/15 text-xl font-black text-cyan-100">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/50">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function Home({ params }: Props) {
  const { locale } = await params;

  return (
    <>
      <StructuredData data={generateWebAppSchema(locale as "es" | "en")} />
      <StructuredData data={generateOrganizationSchema()} />

      <main className="relative min-h-screen overflow-hidden bg-[#05070d] text-white">
        <div className="pointer-events-none fixed inset-0 z-0 opacity-70">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.16),transparent_28%),linear-gradient(180deg,#05070d_0%,#070a12_45%,#030408_100%)]" />
          <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(255,255,255,0.24)_1px,transparent_1px)] [background-size:26px_26px]" />
        </div>

        <section className="relative z-10 px-6 pb-10 pt-34 sm:pb-16 sm:pt-38" aria-label="Hero section">
          <Hero />
        </section>

        <FeatureGrid />

        <section className="relative z-10 w-full py-10 sm:py-16" aria-label="How it works">
          <div className="mx-auto max-w-6xl px-6">
            <InteractiveRecordingSteps />
          </div>
        </section>

        <section className="relative z-10 w-full overflow-hidden pb-24 pt-6 sm:pt-12" aria-label="Editor features and demos">
          <div className="mx-auto max-w-6xl px-6">
            <EditorPreview />
          </div>
          <CarouselDemos />
        </section>
      </main>
    </>
  );
}
