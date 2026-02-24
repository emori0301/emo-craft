import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "emoCraft",
  description: "カスタム絵文字をSlack用に作成",
};

const FONT_URL_1 =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=Noto+Serif+JP:wght@400;700;900&family=M+PLUS+Rounded+1c:wght@400;700;900&family=Kosugi+Maru&family=Zen+Maru+Gothic:wght@400;700;900&family=Zen+Kaku+Gothic+New:wght@400;700;900&family=BIZ+UDPGothic:wght@400;700&display=swap";

const FONT_URL_2 =
  "https://fonts.googleapis.com/css2?family=DotGothic16&family=Dela+Gothic+One&family=Hachi+Maru+Pop&family=Pacifico&family=Zen+Antique:wght@400;700&family=Kaisei+Decol:wght@400;700&family=New+Tegomin&family=Yomogi&family=Reggae+One&family=RocknRoll+One&display=swap";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link href={FONT_URL_1} rel="stylesheet" />
        <link href={FONT_URL_2} rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <TRPCReactProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
