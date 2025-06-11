import { useState, useEffect, useCallback } from 'react';
import { getMCPConfig } from '@/app/actions/mcp/server';
import { ClientConfig } from '@langchain/mcp-adapters';

interface UseMCPConfigOptions {
  onError?: (error: string | null) => void;
  autoLoad?: boolean;
}

export function useMCPConfig(options: UseMCPConfigOptions = {}) {
  const { onError, autoLoad = true } = options;
  
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    onError?.(null);
    
    try {
      const loadedConfig = await getMCPConfig();
      setConfig(loadedConfig);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load MCP config';
      onError?.(errorMessage);
      console.error('Failed to load MCP config:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const saveConfig = useCallback(async (newConfig: ClientConfig) => {
    setIsLoading(true);
    onError?.(null);
    
    try {
      // Here you would call a save action
      // For now, we'll just update the local state
      setConfig(newConfig);
      setLastUpdated(new Date());
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save MCP config';
      onError?.(errorMessage);
      console.error('Failed to save MCP config:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const refreshConfig = useCallback(() => {
    return loadConfig();
  }, [loadConfig]);

  const getConfigAsJSON = useCallback(() => {
    if (!config) return '{}';
    return JSON.stringify(config, null, 2);
  }, [config]);

  const hasUnsavedChanges = useCallback((currentJSON: string) => {
    try {
      const currentConfig = JSON.parse(currentJSON);
      return JSON.stringify(currentConfig) !== JSON.stringify(config);
    } catch {
      return true; // If JSON is invalid, consider it as having changes
    }
  }, [config]);

  // Auto-load config on mount
  useEffect(() => {
    if (autoLoad) {
      loadConfig();
    }
  }, [autoLoad, loadConfig]);

  return {
    // State
    config,
    isLoading,
    lastUpdated,
    
    // Actions
    loadConfig,
    saveConfig,
    refreshConfig,
    
    // Utilities
    getConfigAsJSON,
    hasUnsavedChanges,
    
    // Computed
    isEmpty: !config || Object.keys(config).length === 0,
  };
}