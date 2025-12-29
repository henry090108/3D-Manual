import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Manual Chat",
  description: "3D Printer Manual Chatbot",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
