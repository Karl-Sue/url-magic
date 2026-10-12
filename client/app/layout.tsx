import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CatBite - URLs Made Bite-Sized",
  description:
    "A privacy-first, secure URL shortener and QR generator that munches oversized links down to 6 characters.",
  icons: {
    icon: "/images/logo.webp",
    shortcut: "/images/logo.webp",
    apple: "/images/logo.webp",
  },
  openGraph: {
    title: "CatBite - URLs Made Bite-Sized",
    description:
      "A privacy-first, secure URL shortener and QR generator that munches oversized links down to 6 characters.",
    images: [
      {
        url: "/images/logo.webp",
        alt: "CatBite Logo",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
