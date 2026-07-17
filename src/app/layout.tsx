import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GRESANOVA OS",
  description: "Sistema de Gestión de Relaciones y Flujo Operativo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
