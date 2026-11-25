import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Indicadores · Circuito Cearense de Exposição",
  manifest: "/indicadores.webmanifest",
  icons: { icon: "/marcas/icone-192.png", apple: "/marcas/icone-180.png" },
  appleWebApp: { capable: true, title: "Circuito", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#1d5e2c", width: "device-width", initialScale: 1 };

export default function LayoutIndicadores({ children }: { children: React.ReactNode }) {
  return children;
}
