import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 学你写",
  description: "AI 写作风格训练与写稿工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
