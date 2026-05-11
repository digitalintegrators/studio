import { CarouselDemos } from "@/app/components/ui/CarouselDemos";
import EditorPreview from "@/app/components/ui/EditorPreview";
import Hero from "@/app/components/ui/Hero";
import { HeroScrollMask } from "@/app/components/ui/HeroScrollMask";
import InteractiveRecordingSteps from "@/app/components/ui/RecordingSteps";
import { StructuredData, generateWebAppSchema, generateOrganizationSchema } from "@/app/components/seo/StructuredData";
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = 'https://studio.laboratorios.digital'; // 👈 CAMBIA ESTO

  const metadata = {
    es: {
      title: 'Crea demos profesionales y edita videos en segundos',
      description: 'Plataforma de grabación y edición de video para demos, PoCs y contenido técnico. Sin instalaciones, directamente en tu navegador.',
      keywords: ['editor de video', 'grabar pantalla', 'demos profesionales', 'screen recorder', 'video editor online'],
    },
    en: {
      title: 'Create Professional Demos and Edit Videos in Seconds',
      description: 'Web-based video recording and editing platform for demos, PoCs and technical content.',
      keywords: ['video editor', 'screen recorder', 'professional demos', 'online video editor'],
    },
  };

  const { title, description, keywords } = metadata[locale as 'es' | 'en'] || metadata.es;

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
          alt: 'Studio - Video Platform',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/images/metadata/preview.jpg`],
    },
  };
}

export default async function Home({ params }: Props) {
  const { locale } = await params;

  return (
    <>
      <StructuredData data={generateWebAppSchema(locale as 'es' | 'en')} />
      <StructuredData data={generateOrganizationSchema()} />

      <div className="flex flex-col">
        <div className="relative overflow-hidden bg-gradient-radial-primary w-full">

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-75 h-75 rounded-full bg-cyan-500/15 blur-[80px] pointer-events-none z-0" aria-hidden="true" />

          <section className="pt-32 pb-6 sm:pb-14 bg-gradient-radial-primary" aria-label="Hero section">
            <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
              <Hero />
            </div>
          </section>

          <section className="w-full" aria-label="Product preview">
            <HeroScrollMask />
          </section>
        </div>

        <section className="w-full py-10 sm:py-16" aria-label="How it works">
          <div className="max-w-6xl mx-auto px-6">
            <InteractiveRecordingSteps />
          </div>
        </section>

        <div className="relative overflow-hidden bg-gradient-radial-primary w-full pt-0 pb-30 sm:py-20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-[150%] rounded-[100%] blur-xl pointer-events-none" aria-hidden="true"></div>

          <section className="w-full" aria-label="Editor features and demos">
            <div className="w-full mx-auto bg-[url('/images/pages/dots.svg')] bg-no-repeat bg-contain bg-center">
              <EditorPreview />
            </div>

            <CarouselDemos />
          </section>
        </div>
      </div>
    </>
  );
}