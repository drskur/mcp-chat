import { useState, useEffect } from 'react';

interface UserSettings {
  title: string;
  subtitle: string;
  logoUrl: string;
  logoOpacity: number;
}

interface UserInfo {
  name: string;
  email: string;
}

export function useUserSettings() {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    title: 'PACE MCP AGENT',
    subtitle: 'Enterprise',
    logoUrl: '',
    logoOpacity: 1.0,
  });

  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: 'USER',
    email: 'user@example.com',
  });

  useEffect(() => {
    const loadUserSettings = () => {
      try {
        const savedSettings = localStorage.getItem('user_settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setUserSettings({
            title: parsedSettings.title || 'PACE MCP AGENT',
            subtitle: parsedSettings.subtitle || 'Enterprise',
            logoUrl: parsedSettings.logoUrl || '',
            logoOpacity:
              parsedSettings.logoOpacity !== undefined
                ? parsedSettings.logoOpacity
                : 1.0,
          });
          console.log('사용자 설정 정보를 불러왔습니다', parsedSettings);
        }
      } catch (error) {
        console.error('사용자 설정 정보를 불러오는데 실패했습니다:', error);
      }
    };

    const loadUserInfo = () => {
      try {
        setUserInfo({
          name: 'USER',
          email: 'user@example.com',
        });
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      }
    };

    loadUserSettings();
    loadUserInfo();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_settings' && e.newValue) {
        try {
          const parsedSettings = JSON.parse(e.newValue);
          setUserSettings({
            title: parsedSettings.title || 'PACE MCP AGENT',
            subtitle: parsedSettings.subtitle || 'Enterprise',
            logoUrl: parsedSettings.logoUrl || '',
            logoOpacity:
              parsedSettings.logoOpacity !== undefined
                ? parsedSettings.logoOpacity
                : 1.0,
          });
        } catch (error) {
          console.error('설정 변경 감지 오류:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateUserSettings = () => {
    try {
      const savedSettings = localStorage.getItem('user_settings');
      if (savedSettings) {
        setUserSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('설정 적용 실패:', error);
    }
  };

  return {
    userSettings,
    userInfo,
    updateUserSettings,
  };
}