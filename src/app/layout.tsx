import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import AppShell from "@/components/AppShell";
import SmoothScroll from "@/components/SmoothScroll";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const satoshi = localFont({
  src: [
    {
      path: "../../public/fonts/satoshi-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/satoshi-700.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/satoshi-900.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
});

export const metadata: Metadata = {
  title: "DevSync - Espace Collaboratif",
  description: "Portfolio dynamique et boîte à idées collaborative pour développeurs.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DevSync",
  },
};

export const viewport: Viewport = {
  themeColor: "#F4F3F0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${satoshi.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F4F3F0] text-[#1B1B1B] selection:bg-[#F2C94C]/30 selection:text-black">
        {/* PWA register handler */}
        <PwaRegister />
        
        {/* Main application shell with smooth scrolling */}
        <SmoothScroll>
          <AppShell>{children}</AppShell>
        </SmoothScroll>
      </body>
    </html>
  );
}

