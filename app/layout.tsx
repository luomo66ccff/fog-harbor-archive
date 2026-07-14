import type { Metadata } from "next";
import "./globals.css";
import "./responsive.css";

export const metadata: Metadata = {
  title: "雾港档案：失踪的第七码头",
  description: "进入停机七年的港务档案系统，校准被偷走的十一分钟，拼出白鹭七号与林知夏失踪案的真相。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "雾港档案：失踪的第七码头",
    description: "一部可游玩的沉浸式悬疑调查档案。",
    type: "website",
    images: [{ url: "/og-fog-harbor.png", width: 1672, height: 941, alt: "雨夜中的雾港第七码头与停泊货轮" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-fog-harbor.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
