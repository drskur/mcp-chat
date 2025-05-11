import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { initUploadDirectories } from "./api/init-upload-dir";

// 서버 시작 시 업로드 디렉토리 초기화
// 서버 사이드에서만 실행됨
if (typeof window === 'undefined') {
  console.log('서버 시작 시 업로드 디렉토리 초기화 중...');
  initUploadDirectories()
    .then((result) => {
      if (result) {
        console.log('업로드 디렉토리 초기화 성공');
      } else {
        console.error('업로드 디렉토리 초기화 실패');
      }
    })
    .catch((error) => {
      console.error('업로드 디렉토리 초기화 오류:', error);
    });
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PACE MCP Agent",
  description: "PACE MCP Agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
