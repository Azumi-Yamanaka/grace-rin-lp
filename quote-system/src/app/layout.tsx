import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/sidebar";

export const metadata: Metadata = {
  title: "見積管理システム",
  description: "製造業向け 見積半自動化システム（MVP）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}
