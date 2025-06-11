import React, { useState, useCallback } from 'react';
import { FileAttachment } from '@/types/file-attachment';

interface UseChatInputOptions {
  onSubmit?: (message: string, attachments: FileAttachment[]) => void;
  onNewChat?: (message?: string, attachments?: FileAttachment[]) => void;
  maxLength?: number;
  placeholder?: string;
}

export function useChatInput(options: UseChatInputOptions = {}) {
  const { onSubmit, maxLength = 10000 } = options;

  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setInputValue(value);
    }
  }, [maxLength]);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  const handleSubmit = useCallback((attachments: FileAttachment[] = []) => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const message = inputValue.trim();
    setInputValue('');

    if (onSubmit) {
      onSubmit(message, attachments);
    }
  }, [inputValue, onSubmit]);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    attachments: FileAttachment[] = []
  ) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();

      if (inputValue.trim() || attachments.length > 0) {
        handleSubmit(attachments);
      }
    }
  }, [inputValue, isComposing, handleSubmit]);

  const handleFormSubmit = useCallback((
    e: React.FormEvent<HTMLFormElement>,
    attachments: FileAttachment[] = []
  ) => {
    e.preventDefault();
    handleSubmit(attachments);
  }, [handleSubmit]);

  const clearInput = useCallback(() => {
    setInputValue('');
  }, []);

  const setInput = useCallback((value: string) => {
    if (value.length <= maxLength) {
      setInputValue(value);
    }
  }, [maxLength]);

  const appendToInput = useCallback((text: string) => {
    const newValue = inputValue + text;
    if (newValue.length <= maxLength) {
      setInputValue(newValue);
    }
  }, [inputValue, maxLength]);

  const isEmpty = !inputValue.trim();
  const isNearLimit = inputValue.length > maxLength * 0.9;
  const remainingChars = maxLength - inputValue.length;

  return {
    // State
    inputValue,
    isComposing,
    isEmpty,
    isNearLimit,
    remainingChars,

    // Handlers
    handleInputChange,
    handleKeyDown,
    handleSubmit,
    handleFormSubmit,
    handleCompositionStart,
    handleCompositionEnd,

    // Actions
    clearInput,
    setInput,
    appendToInput,
  };
}