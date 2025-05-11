import React, { useState, useEffect } from 'react';
import { RefreshCw, Upload, Check, AlertCircle, RotateCcw, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface UserSettings {
  title: string;
  subtitle: string;
  logoUrl: string;
  logoOpacity: number;
}

interface UserSettingsProps {
  onSettingsChanged: () => void;
}

// 기본 설정값 정의
const DEFAULT_SETTINGS: UserSettings = {
  title: 'PACE MCP AGENT',
  subtitle: 'Enterprise',
  logoUrl: '', // 기본 로고는 빈 문자열로 설정하고 UI에서 기본 아이콘 표시
  logoOpacity: 1.0
};

const UserSettings: React.FC<UserSettingsProps> = ({ onSettingsChanged }) => {
  const [settings, setSettings] = useState<UserSettings>({...DEFAULT_SETTINGS});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  
  // 파일 객체 저장
  const [, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // 로컬 스토리지에서 설정을 불러옵니다
      const savedSettings = localStorage.getItem('user_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({
          ...parsedSettings,
          logoOpacity: parsedSettings.logoOpacity !== undefined ? parsedSettings.logoOpacity : 1.0
        });
        if (parsedSettings.logoUrl) {
          setPreviewImage(parsedSettings.logoUrl);
        } else {
          // 저장된 로고 URL이 없는 경우 빈 문자열로 설정 (UI에서 기본 아이콘 표시)
          setPreviewImage('');
        }
      } else {
        // 저장된 설정이 없는 경우 기본값 사용
        setSettings({...DEFAULT_SETTINGS});
        setPreviewImage('');
      }
    } catch (error) {
      console.error('설정을 불러오는데 실패했습니다:', error);
      setStatusMessage({
        type: 'error',
        message: '설정을 불러오는데 실패했습니다.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // 로컬 스토리지에 설정을 저장합니다
      localStorage.setItem('user_settings', JSON.stringify(settings));
      
      setStatusMessage({
        type: 'success',
        message: '설정이 저장되었습니다.'
      });
      
      // 부모 컴포넌트에 변경 사항 알림
      onSettingsChanged();
      
      // 로고 파일 참조 초기화
      setLogoFile(null);
      
      // 3초 후 메시지 제거
      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
    } catch (error) {
      console.error('설정을 저장하는데 실패했습니다:', error);
      setStatusMessage({
        type: 'error',
        message: '설정을 저장하는데 실패했습니다.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 파일 크기 검사 (1MB 제한)
    if (file.size > 1024 * 1024) {
      setStatusMessage({
        type: 'error',
        message: '로고 파일은 1MB 이하여야 합니다.'
      });
      return;
    }
    
    // 파일 형식 검사
    if (!file.type.startsWith('image/')) {
      setStatusMessage({
        type: 'error',
        message: '이미지 파일만 업로드 가능합니다.'
      });
      return;
    }
    
    // 파일 저장
    setLogoFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewImage(result);
      setSettings(prev => ({
        ...prev,
        logoUrl: result
      }));
    };
    reader.readAsDataURL(file);
  };

  const resetLogo = () => {
    setPreviewImage('');
    setLogoFile(null);
    setSettings(prev => ({
      ...prev,
      logoUrl: ''
    }));
  };

  // 모든 설정을 기본값으로 초기화하는 함수
  const resetToDefault = () => {
    setSettings({...DEFAULT_SETTINGS});
    setPreviewImage('');
    setLogoFile(null);
    setStatusMessage({
      type: 'success',
      message: '모든 설정이 기본값으로 초기화되었습니다.'
    });
    
    // 3초 후 메시지 제거
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value);
    setSettings(prev => ({
      ...prev,
      logoOpacity: opacity
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">사용자 인터페이스 설정</h3>
        <p className="text-sm text-gray-400">시스템 로고와 타이틀을 사용자 정의합니다.</p>
      </div>
      
      <div className="space-y-4">
        {/* 타이틀 설정 */}
        <div>
          <label className="block text-sm font-medium mb-1">시스템 타이틀</label>
          <input
            type="text"
            name="title"
            value={settings.title}
            onChange={handleInputChange}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="시스템 이름을 입력하세요"
          />
        </div>
        
        {/* 서브타이틀 설정 */}
        <div>
          <label className="block text-sm font-medium mb-1">서브타이틀</label>
          <input
            type="text"
            name="subtitle"
            value={settings.subtitle}
            onChange={handleInputChange}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="서브타이틀을 입력하세요"
          />
        </div>
        
        {/* 로고 설정 */}
        <div>
          <label className="block text-sm font-medium mb-2">시스템 로고</label>
          
          <div className="flex items-start gap-4 mb-3">
            {/* 로고 이미지 컨테이너 */}
            <div className="w-20 h-20 bg-gray-800 border border-gray-700 hover:border-indigo-700 transition-colors rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
              {previewImage ? (
                <Image 
                  src={previewImage} 
                  alt="로고 미리보기" 
                  className="w-full h-full object-contain rounded-md"
                  style={{ opacity: settings.logoOpacity }}
                  fill
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <Brain className="w-10 h-10 text-indigo-500" />
                </div>
              )}
            </div>
            
            {/* 버튼 컨테이너 */}
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex gap-2 items-center bg-indigo-900/70 hover:bg-indigo-800 text-indigo-300 border-indigo-700 hover:border-indigo-500 transition-colors shadow-sm hover:shadow-indigo-900/30"
                  onClick={() => document.getElementById('logo-upload-input')?.click()}
                >
                  <Upload className="h-4 w-4" />
                  로고 업로드
                </Button>
                <input
                  id="logo-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                
                {/* 로고 초기화 버튼 */}
                {previewImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetLogo}
                    className="text-red-400 hover:text-red-300 border-red-900 bg-red-900/30 hover:bg-red-900/50 transition-colors shadow-sm hover:shadow-red-900/30"
                  >
                    로고 제거
                  </Button>
                )}
                
                {/* 모든 설정 초기화 버튼 추가 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefault}
                  className="flex gap-2 items-center bg-gray-800/70 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-gray-600 transition-colors shadow-sm hover:shadow-gray-900/30"
                >
                  <RotateCcw className="h-4 w-4" />
                  기본값으로 초기화
                </Button>
              </div>
              
              <p className="text-xs text-gray-400">
                권장 크기: 512x512px, 최대 크기: 1MB, 파일 형식: PNG, JPG
              </p>
            </div>
          </div>
          
          {/* 로고 투명도 조절 추가 */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">로고 투명도</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.logoOpacity}
                onChange={handleOpacityChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-sm text-gray-300 w-10">
                {Math.round(settings.logoOpacity * 100)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* 미리보기 */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">미리보기</h4>
          <div className="flex flex-col gap-6">
            {/* 헤더 미리보기 */}
            <div className="p-4 bg-gray-900 rounded-md">
              <p className="text-xs text-gray-500 mb-2">헤더</p>
              <div className="flex items-center gap-3">
                <div className="rounded-lg overflow-hidden flex items-center justify-center" style={{ width: '50px', height: '38px' }}>
                  {previewImage ? (
                    <Image 
                      src={previewImage} 
                      alt="로고" 
                      className="w-full h-full object-cover rounded-lg"
                      style={{ opacity: settings.logoOpacity }}
                      fill
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-indigo-600 rounded-lg flex items-center justify-center">
                      <Brain className="h-5 w-5 text-indigo-300" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold gradient-text">{settings.title}</h3>
                  <p className="text-xs text-gray-400">{settings.subtitle}</p>
                </div>
              </div>
            </div>
            
            {/* 메인 화면 미리보기 */}
            <div className="p-4 bg-gray-900 rounded-md">
              <p className="text-xs text-gray-500 mb-2">메인 화면</p>
              <div className="flex flex-col items-center text-center">
                <div className="relative w-28 h-28 mb-4">
                  <div className="absolute inset-0 bg-indigo-600/40 rounded-xl blur-lg opacity-50"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-purple-700/90 rounded-xl flex items-center justify-center backdrop-blur-sm border border-indigo-500/30">
                    {previewImage ? (
                      <Image 
                        src={previewImage} 
                        alt="로고" 
                        className="w-full h-full object-contain"
                        style={{ opacity: settings.logoOpacity }}
                        fill
                        unoptimized
                      />
                    ) : (
                      <Brain className="w-10 h-10 text-indigo-300" />
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400">
                  {settings.title}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 상태 메시지 */}
      {statusMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-md ${
          statusMessage.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {statusMessage.type === 'success' ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{statusMessage.message}</span>
        </div>
      )}
      
      {/* 저장 버튼 */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={saveSettings}
          disabled={isLoading || isSaving}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-md flex items-center gap-2 shadow-[0_4px_12px_rgba(79,70,229,0.4)] hover:shadow-[0_6px_16px_rgba(79,70,229,0.6)] border-0 transition-all"
        >
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {isSaving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  );
};

export default UserSettings; 