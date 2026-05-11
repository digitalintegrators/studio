import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#050505' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://studio.laboratorios.digital'),
  title: {
    default: "studio - Crea demos profesionales y edita en segundos",
    template: "%s | studio",
  },
  description: "Crea demos cinemáticas y edita videos en segundos. Añade zooms suaves, mockups, personaliza fondos y exporta demos profesionales.",
  applicationName: "studio",
  keywords: [
    "Studio",
    "edición de video",
    "zoom video",
    "grabación de pantalla",
    "creador de demos",
    "tomas cinemáticas",
    "mockups",
    "Edgar Moreno",
  ],
  authors: [{ name: "Edgar Moreno" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "https://studio.laboratorios.digital/",
  },
  icons: {
    icon: "/images/metadata/favicon.svg",
    shortcut: "/images/metadata/shortcut.svg",
    apple: "/images/metadata/apple.svg",
  },
  openGraph: {
    type: "website",
    url: "https://studio.laboratorios.digital/",
    title: "studio - Crea demos profesionales y edita en segundos",
    description:
      "Añade zooms suaves, mockups, personaliza fondos y exporta demos profesionales sin editores complejos.",
    images: [
      {
        url: "https://openvid.dev/images/metadata/preview-openvid.jpg",
        width: 1200,
        height: 630,
        alt: "studio - Creador de demos, Graba Pantalla y Editor de Video",
      },
    ],
    locale: "es_ES",
    siteName: "studio",
  },
  twitter: {
    card: "summary_large_image",
    title: "openvid - Crea demos profesionales y edita en segundos",
    description:
      "Añade zooms suaves, mockups, personaliza fondos y exporta demos profesionales sin editores complejos.",
    images: ["https://openvid.dev/images/metadata/preview-openvid.jpg"],
    creator: "@edgar__moreno",
    site: "@laboratoriosdigitales",
  },
  other: {
    "msapplication-TileColor": "#1f2937",
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}