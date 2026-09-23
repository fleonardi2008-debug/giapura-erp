import type { Metadata } from "next";
import { Playfair_Display, Nanum_Pen_Script } from "next/font/google";
import "./zona-sur.css";

export const metadata: Metadata = {
  title: "Pedidos Zona Sur | Giapura",
  description: "Pedí tu pack de Giapura con envío a zona sur o retiro en un punto de encuentro.",
};

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
});

const nanumPen = Nanum_Pen_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-nanum-pen",
});

export default function ZonaSurLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${playfair.variable} ${nanumPen.variable}`}>{children}</div>;
}
