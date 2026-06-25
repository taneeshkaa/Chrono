import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalNav from "@/components/layout/GlobalNav";
import Sidebar from "@/components/layout/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChronoAI | Time Intelligence Dashboard",
  description: "AI-powered commitment management and time intelligence platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="flex flex-col h-screen">
          <GlobalNav />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
