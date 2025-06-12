"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlaceholdersAndVanishInputProps {
  placeholders: string[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  value?: string;
  className?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
  rightElement?: React.ReactNode;
}

export function PlaceholdersAndVanishInput({
  placeholders,
  onChange,
  onSubmit,
  value,
  className,
  disabled = false,
  submitDisabled = false,
  rightElement,
}: PlaceholdersAndVanishInputProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typingPlaceholder, setTypingPlaceholder] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  // value prop이 변경되면 현재 입력값 업데이트
  useEffect(() => {
    if (value !== undefined) {
      setCurrentValue(value);
    }
  }, [value]);

  // 타이핑 애니메이션 효과
  useEffect(() => {
    if (!placeholders.length) return;

    const currentFullText = placeholders[placeholderIndex];
    let timer: NodeJS.Timeout;

    if (typingPlaceholder) {
      // 타이핑 중인 경우
      if (currentPlaceholder.length < currentFullText.length) {
        timer = setTimeout(() => {
          setCurrentPlaceholder(currentFullText.slice(0, currentPlaceholder.length + 1));
        }, 75); // 타이핑 속도
      } else {
        // 타이핑 완료, 대기 후 지우기 시작
        timer = setTimeout(() => {
          setTypingPlaceholder(false);
        }, 2000); // 2초 대기
      }
    } else {
      // 지우는 중인 경우
      if (currentPlaceholder.length > 0) {
        timer = setTimeout(() => {
          setCurrentPlaceholder(prev => prev.slice(0, -1));
        }, 50); // 지우는 속도
      } else {
        // 지우기 완료, 다음 플레이스홀더로 이동
        timer = setTimeout(() => {
          setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
          setTypingPlaceholder(true);
        }, 500); // 다음 플레이스홀더로 이동 전 대기 시간
      }
    }

    return () => clearTimeout(timer);
  }, [placeholders, placeholderIndex, currentPlaceholder, typingPlaceholder]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentValue(e.target.value);
    if (onChange) {
      onChange(e);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // 이벤트 버블링 방지

    if (currentValue.trim()) {
      if (onSubmit) {
        onSubmit(e);
      }
    } else {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className={cn(
        "relative flex w-full max-w-3xl items-center transition-all duration-300 ease-in-out",
        isFocused || currentValue ? "scale-105" : "",
        className
      )}
    >
      <div className="group relative w-full">
        <div className="absolute inset-y-0 flex items-center pl-3 text-gray-500">
          <Search className="h-5 w-5" />
        </div>
        <Input
          ref={inputRef}
          value={currentValue}
          onChange={handleInputChange}
          placeholder={!isFocused ? currentPlaceholder : "What would you like to know?"}
          className={cn(
            "h-14 w-full rounded-full border border-gray-800 bg-gray-900/60 pl-10 pr-24 text-base text-white backdrop-blur-sm transition-all duration-300 placeholder:text-gray-400",
            "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
            "hover:border-gray-700",
            isFocused || currentValue
              ? "shadow-lg shadow-indigo-500/10"
              : ""
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
        />
        <div className="absolute right-14 top-1/2 -translate-y-1/2 flex items-center">
          {rightElement}
        </div>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 mr-2 flex items-center justify-center transition-all duration-300",
            currentValue.trim() && !submitDisabled
              ? "text-indigo-400 hover:text-indigo-300"
              : "text-gray-500"
          )}
          disabled={!currentValue.trim() || disabled || submitDisabled}
        >
          <Send className="transform -rotate-45 !w-5 !h-5 mt-2" />
        </Button>
      </div>
    </form>
  );
}
