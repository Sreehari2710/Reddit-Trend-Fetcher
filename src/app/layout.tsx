import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Reddit Trend Fetcher",
  description: "Lightweight tool to discover and fetch top Reddit posts without credentials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col font-sans bg-slate-950 text-slate-100 select-none">
        {/* Structural Sharp Header (Strict dashboard grid layout) */}
        <header className="border-b border-slate-900 bg-slate-950 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center shadow shadow-orange-500/10">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.85-1.64-6.29-1.72l1.24-3.9 3.42.77c.05.9.79 1.62 1.7 1.62 1.04 0 1.89-.85 1.89-1.89s-.85-1.89-1.89-1.89c-.73 0-1.36.42-1.68 1.03l-3.8-.85c-.17-.04-.34.05-.39.22L11 8c-2.48.04-4.73.68-6.39 1.69-.57-.75-1.46-1.22-2.46-1.22-1.65 0-3 1.35-3 3 0 1 .5 1.9 1.27 2.47-.07.4-.1.81-.1 1.23 0 4.14 4.8 7.5 10.72 7.5 5.9 0 10.7-3.36 10.7-7.5 0-.41-.03-.82-.09-1.21.73-.57 1.22-1.46 1.22-2.46zM6 14c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 4.25c-1.8 1.8-5.2 1.8-7 0-.15-.15-.15-.4 0-.55.15-.15.4-.15.55 0 1.5 1.5 4.4 1.5 5.9 0 .15-.15.4-.15.55 0 .15.15.15.4 0 .55zm-1.25-2.25c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                </svg>
              </div>
              <span className="font-bold text-base uppercase tracking-wider text-slate-100">
                Reddit Trend Fetcher
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded border border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                ● Serverless Mode
              </span>
            </div>
          </div>
          <Navbar />
        </header>

        <div className="flex-1">{children}</div>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-8 bg-slate-950 mt-20">
          <div className="max-w-7xl mx-auto px-6 text-center text-[10px] font-mono uppercase tracking-wider text-slate-600">
            <p>© {new Date().getFullYear()} Reddit Trend Fetcher. Pure static clientless application.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
