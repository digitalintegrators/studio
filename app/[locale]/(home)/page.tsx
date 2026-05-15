import {
  StructuredData,
  generateOrganizationSchema,
  generateWebAppSchema,
} from "@/app/components/seo/StructuredData";
import { CarouselDemos } from "@/app/components/ui/CarouselDemos";
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
      title: "Studio — Demos cinematográficas desde el navegador",
      description:
        "Graba pantalla, cámara, micrófono y audio del sistema. Edita demos con timeline, spotlight, máscaras, zooms y exportación profesional.",
      keywords: [
        "editor de video",
        "grabar pantalla",
        "demos profesionales",
        "screen recorder",
        "video editor online",
        "spotlight",
        "zoom video",
      ],
    },
    en: {
      title: "Studio — Cinematic product demos from your browser",
      description:
        "Record screen, camera, microphone and system audio. Edit demos with timeline, spotlight, masks, zooms and professional export.",
      keywords: [
        "video editor",
        "screen recorder",
        "professional demos",
        "online video editor",
        "spotlight",
        "video zoom",
      ],
    },
  };

  const { title, description, keywords } =
    metadata[locale as "es" | "en"] || metadata.es;

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

function FeatureGrid({ locale }: { locale: string }) {
  const copy = {
    es: {
      eyebrow: "Editor visual",
      title: "Una landing que se siente como el producto.",
      description:
        "Todo se alinea con el editor: profundidad, vidrio, azul digital, transiciones suaves y una interfaz que siempre muestra valor real.",
      features: [
        {
          title: "Timeline visual",
          description:
            "Thumbnails, waveform y fragmentos para editar sin perder contexto.",
          icon: "⌁",
          tone: "from-[#3c83f6]/18 to-[#7df0f8]/10",
        },
        {
          title: "Spotlight & máscaras",
          description:
            "Resalta palabras, botones o zonas clave con efectos editables por tiempo.",
          icon: "◉",
          tone: "from-amber-300/16 to-violet-300/10",
        },
        {
          title: "Zoom cinematográfico",
          description:
            "Guía la atención con movimientos suaves y foco visual para demos claras.",
          icon: "⌕",
          tone: "from-violet-300/16 to-[#3c83f6]/10",
        },
        {
          title: "Grabación completa",
          description:
            "Pantalla, cámara, micrófono y audio del sistema en una sola experiencia.",
          icon: "●",
          tone: "from-emerald-300/14 to-[#7df0f8]/10",
        },
      ],
    },
    en: {
      eyebrow: "Visual editor",
      title: "A landing page that feels like the product.",
      description:
        "Everything matches the editor: depth, glass, digital blue, smooth transitions and an interface that always shows real value.",
      features: [
        {
          title: "Visual timeline",
          description:
            "Thumbnails, waveform and fragments so you can edit without losing context.",
          icon: "⌁",
          tone: "from-[#3c83f6]/18 to-[#7df0f8]/10",
        },
        {
          title: "Spotlight & masks",
          description:
            "Highlight words, buttons or key areas with time-based editable effects.",
          icon: "◉",
          tone: "from-amber-300/16 to-violet-300/10",
        },
        {
          title: "Cinematic zoom",
          description:
            "Guide attention with smooth movement and visual focus for clearer demos.",
          icon: "⌕",
          tone: "from-violet-300/16 to-[#3c83f6]/10",
        },
        {
          title: "Complete recording",
          description:
            "Screen, camera, microphone and system audio in one seamless experience.",
          icon: "●",
          tone: "from-emerald-300/14 to-[#7df0f8]/10",
        },
      ],
    },
  };

  const text = copy[locale as "es" | "en"] ?? copy.es;

  return (
    <section id="features" className="relative z-10 w-full py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#9bdcff] shadow-[0_0_34px_rgba(60,131,246,0.16)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7df0f8]" />
            {text.eyebrow}
          </span>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.055em] text-white sm:text-5xl">
            {text.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/52">
            {text.description}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {text.features.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#7df0f8]/24 hover:bg-white/[0.055]"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.tone} opacity-80 transition group-hover:opacity-100`}
              />
              <div className="relative">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-xl font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold tracking-tight text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  {feature.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ locale }: { locale: string }) {
  const copy = {
    es: {
      eyebrow: "Ready for your next demo",
      title: "Convierte una grabación normal en una demo que parece producida.",
      description:
        "Graba, enfoca, resalta, exporta y comparte. Todo desde una experiencia visual coherente y ligera.",
    },
    en: {
      eyebrow: "Ready for your next demo",
      title: "Turn a regular recording into a demo that feels produced.",
      description:
        "Record, focus, highlight, export and share. Everything from one coherent, lightweight visual experience.",
    },
  };

  const text = copy[locale as "es" | "en"] ?? copy.es;

  return (
    <section className="relative z-10 pb-24 pt-8">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_26px_130px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(60,131,246,0.24),transparent_45%),radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.16),transparent_35%)]" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7df0f8]/70">
              {text.eyebrow}
            </p>
            <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">
              {text.title}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/52">
              {text.description}
            </p>
          </div>
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

      <main className="relative min-h-screen overflow-hidden bg-[#03050b] text-white">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-12%,rgba(60,131,246,0.26),transparent_34%),radial-gradient(circle_at_13%_18%,rgba(168,85,247,0.15),transparent_28%),radial-gradient(circle_at_88%_22%,rgba(125,240,248,0.11),transparent_24%),linear-gradient(180deg,#05070d_0%,#07101d_48%,#02040a_100%)]" />
          <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(3,5,11,0.75)_78%,#03050b)]" />
        </div>

        <section
          className="relative z-10 px-6 pb-14 pt-34 sm:pb-20 sm:pt-38"
          aria-label="Hero section"
        >
          <Hero />
        </section>

        <FeatureGrid locale={locale} />

        <section
          className="relative z-10 w-full py-10 sm:py-16"
          aria-label="How it works"
        >
          <div className="mx-auto max-w-6xl px-6">
            <InteractiveRecordingSteps />
          </div>
        </section>

        <section
          className="relative z-10 w-full overflow-hidden pb-14 pt-6 sm:pt-12"
          aria-label="Editor demos"
        >
          <CarouselDemos />
        </section>

        <FinalCTA locale={locale} />
      </main>
    </>
  );
}
