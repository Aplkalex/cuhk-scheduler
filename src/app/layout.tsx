import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Make sure shared links and previews show the correct brand
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://queuesis.vercel.app"),
  title: {
    default: "Queuesis — CUHK Timetable Planner",
    template: "%s · Queuesis",
  },
  applicationName: "Queuesis",
  description: "Plan your perfect CUHK timetable",
  openGraph: {
    title: "Queuesis — CUHK Timetable Planner",
    description: "Plan your perfect CUHK timetable",
    url: "/",
    siteName: "Queuesis",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Queuesis — CUHK Timetable Planner",
    description: "Plan your perfect CUHK timetable",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:bg-[#1e1e1e]`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
