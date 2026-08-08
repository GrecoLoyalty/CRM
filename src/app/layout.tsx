import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* Las tres fuentes que ya estaban declaradas en tailwind.config.ts pero
   que nunca se cargaban. next/font las auto-hospeda: sin salto de layout
   y sin pedidos a Google en tiempo de ejecución. */
const display = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GRESANOVA OS",
  description: "Sistema de Gestión de Relaciones y Flujo Operativo",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090E19",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
