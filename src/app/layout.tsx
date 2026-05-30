import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
