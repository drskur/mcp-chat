'use client';

import {
  Settings,
  MessageCircle,
  PlusIcon,
  Book,
  BarChart3,
  Brain,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarFooter,
  SidebarSeparator
} from '@/components/ui/sidebar';
import Image from 'next/image';

interface UserSettings {
  title: string;
  subtitle: string;
  logoUrl: string;
  logoOpacity: number;
}

interface MainSidebarProps {
  userSettings: UserSettings;
  userName: string;
  userEmail: string;
  onNewChat: () => void;
  onSettingsClick: (type: 'tools' | 'prompt' | 'model' | 'user' | 'help') => void;
}

export const MainSidebar = ({
  userSettings,
  userName,
  userEmail,
  onNewChat,
  onSettingsClick
}: MainSidebarProps) => {
  const router = useRouter();

  const handleSettingsClick = (type: 'tools' | 'prompt' | 'model' | 'user' | 'help') => {
    const params = new URLSearchParams();
    params.set('settings', type);
    router.push(`/?${params.toString()}`);
    onSettingsClick(type);
  };
  return (
    <Sidebar variant="inset" className="border-r border-gray-900 bg-[#0f0f10] overflow-y-auto overflow-x-hidden">
      <SidebarHeader className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-lg overflow-hidden" style={{ width: '60px', height: '36px' }}>
            {userSettings.logoUrl ? (
              <Image
                src={userSettings.logoUrl}
                alt="로고"
                className="w-full h-full object-cover rounded-lg"
                style={{ opacity: userSettings.logoOpacity }}
              />
            ) : (
              <div className="w-full h-full bg-indigo-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">{userSettings.title}</h1>
            <p className="text-xs text-gray-400">{userSettings.subtitle}</p>
          </div>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="w-full justify-start gap-2 py-2 mb-3 bg-indigo-600 hover:bg-indigo-700 rounded-md"
                onClick={onNewChat}
              >
                <PlusIcon className="h-4 w-4" />
                <span className="text-sm">새 대화</span>
              </SidebarMenuButton>

              <SidebarMenuButton
                className="w-full justify-start gap-3"
                onClick={() => handleSettingsClick('model')}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="flex-grow text-left">AI 모델</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                className="w-full justify-start gap-3"
                onClick={() => handleSettingsClick('tools')}
              >
                <Settings className="h-5 w-5" />
                <span>MCP 도구</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                className="w-full justify-start gap-3"
                onClick={() => handleSettingsClick('prompt')}
              >
                <MessageCircle className="h-5 w-5" />
                <span>시스템 프롬프트</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                className="w-full justify-start gap-3"
                onClick={() => handleSettingsClick('help')}
              >
                <Book className="h-5 w-5" />
                <span>도움말</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="my-3 bg-gray-800 w-[90%] mx-auto" />
      </SidebarContent>

      <SidebarFooter className="mt-auto p-4 border-t border-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-yellow-300 font-medium">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{userName}</p>
            <p className="text-xs text-gray-400 truncate">{userEmail}</p>
          </div>
          <button
            className="p-1.5 hover:bg-gray-800 rounded-md transition-colors"
            onClick={() => handleSettingsClick('user')}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};