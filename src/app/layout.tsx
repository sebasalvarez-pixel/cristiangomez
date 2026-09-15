import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Christian Gómez | Peluquería y Asesor de Imagen en Neiva",
    template: "%s | Christian Gómez",
  },
  description:
    "Peluquería y asesoría de imagen en Neiva, Huila. Colorista internacional: balayage, mechas, alisados, maquillaje social y looks para novias y quinceañeras. Más de 15 años de experiencia.",
  keywords: [
    "peluqueria neiva",
    "maquillaje neiva",
    "asesor de imagen neiva",
    "colorista neiva",
    "balayage neiva",
    "peluqueria huila",
    "christian gomez peluqueria",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Christian Gómez",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Christian Gómez | Peluquería y Asesor de Imagen en Neiva",
    description:
      "Colorista internacional en Neiva, Huila. Asesoría de imagen, balayage, alisados y looks para novias y quinceañeras.",
    url: SITE_URL,
    siteName: "Christian Gómez",
    locale: "es_CO",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
