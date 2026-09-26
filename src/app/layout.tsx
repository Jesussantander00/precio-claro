import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Precio Claro",
  description:
    "Prototipo académico para verificar tarifas de transporte y precios de referencia antes de pagar en Cartagena de Indias.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout, no pages/_document.js exists */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
