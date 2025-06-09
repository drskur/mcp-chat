import React from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { RestartResult } from '../types';

interface ResultNotificationProps {
  result: RestartResult | null;
  onClose: () => void;
}

export const ResultNotification: React.FC<ResultNotificationProps> = ({ result, onClose }) => {
  if (!result) return null;
  
  return (
    <div className={`fixed bottom-6 right-6 max-w-md ${result.success ? 'bg-emerald-900/90' : 'bg-red-900/90'} rounded-lg p-4 shadow-xl border ${result.success ? 'border-emerald-700' : 'border-red-700'} z-50 animate-fade-in`}>
      <div className="flex items-start gap-3">
        {result.success ? (
          <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          <p className={`text-sm ${result.success ? 'text-emerald-200' : 'text-red-200'}`}>
            {result.message}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};