import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Polar", template: "%s · Polar" },
  description: "Acompañamiento compartido para las rutinas de diabetes tipo 1.",
  applicationName: "Polar",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Polar" },
};

export const viewport: Viewport = {
  themeColor: "#faf8f5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${nunito.variable} h-full`}>
      <body className="min-h-full">
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
