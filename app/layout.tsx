import type { Metadata, Viewport } from "next";
import { Lilita_One, Nunito_Sans } from "next/font/google";
import "./globals.css";

const nunito = Nunito_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--fonte-texto" });
const lilita = Lilita_One({ subsets: ["latin"], weight: "400", variable: "--fonte-logo" });

export const metadata: Metadata = {
  title: "Avaliação das Exposições",
  description: "Circuito Cearense de Exposição Agropecuária: avaliação das exposições pelos produtores",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1d5e2c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} ${lilita.variable}`}>
      <body>{children}</body>
    </html>
  );
}
