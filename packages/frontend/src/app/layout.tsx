import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { validateEnv } from '@/lib/config/env';
import { initDirs } from '@/lib/config/init-dir';
import { getMCPServers, updateMCPConfig } from '@/app/actions/mcp/server';
import { getUserSettings } from '@/app/actions/settings/user-settings';
import { initializeBedrockClient, initializePromptManager } from '@/app/actions/agent';

// 서버 시작 시 업로드 디렉토리 초기화 및 MCP 설정 업데이트
// 서버 사이드에서만 실행됨
if (typeof window === 'undefined') {
  validateEnv();

  // 비동기 초기화 작업 병렬 실행
  (async () => {
    await initDirs();
    const settings = await getUserSettings();
    await updateMCPConfig(settings.currentAgent);
    await getMCPServers();
    await initializeBedrockClient(settings.currentAgent);
    await initializePromptManager(settings.currentAgent);
  })()
    .then(() => {
      console.log('디렉토리 및 MCP 설정 초기화 성공');
    })
    .catch((error) => {
      console.error('초기화 오류:', error);
    });
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PACE MCP Agent',
  description: 'PACE MCP Agent',
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
