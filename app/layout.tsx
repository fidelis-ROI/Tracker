import type { Metadata } from "next";
import { Titillium_Web, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const titillium = Titillium_Web({
  variable: "--font-titillium",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "900"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NitroADS Tracker — Torre de Comando",
  description: "Plataforma de NPS para escuderias de tráfego e criativos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titillium.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-[#00020A] text-white antialiased font-manrope">
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
