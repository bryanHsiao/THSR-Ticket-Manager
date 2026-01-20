/**
 * API Key Settings Component
 * Allows users to input and manage their OpenAI API key
 */

import { useState, useEffect } from 'react';
import { llmConfigService } from '../services/llmConfigService';

interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

/**
 * API Key Settings Modal
 */
export function ApiKeySettings({ isOpen, onClose, onSave }: ApiKeySettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load existing key on mount
  useEffect(() => {
    if (isOpen) {
      const existingKey = llmConfigService.getApiKey();
      if (existingKey) {
        // Show masked version
        setApiKey(existingKey);
      } else {
        setApiKey('');
      }
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: '請輸入 API Key' });
      return;
    }

    // Basic validation for OpenAI key format
    if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-proj-')) {
      setMessage({ type: 'error', text: 'API Key 格式不正確（應以 sk- 開頭）' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      llmConfigService.setApiKey(apiKey.trim());
      setMessage({ type: 'success', text: 'API Key 已儲存' });

      // Notify parent and close after a short delay
      setTimeout(() => {
        onSave();
        onClose();
      }, 1000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '儲存失敗'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    llmConfigService.clearApiKey();
    setApiKey('');
    setMessage({ type: 'success', text: 'API Key 已清除' });
  };

  const hasExistingKey = llmConfigService.isConfigured();

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
      onClick={onClose}
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              API 設定
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="關閉"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Status indicator */}
            <div className={`flex items-center gap-2 text-sm ${hasExistingKey ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${hasExistingKey ? 'bg-green-500' : 'bg-gray-400'}`} />
              {hasExistingKey ? '已設定 API Key' : '尚未設定 API Key'}
            </div>

            {/* API Key input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                OpenAI API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={showKey ? '隱藏' : '顯示'}
                >
                  {showKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                API Key 只會儲存在你的瀏覽器中，不會傳送到任何伺服器
              </p>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {message.text}
              </div>
            )}

            {/* How to get API Key */}
            <details className="text-sm">
              <summary className="cursor-pointer text-orange-600 dark:text-orange-400 hover:underline">
                如何取得 API Key？
              </summary>
              <ol className="mt-2 ml-4 space-y-1 text-gray-600 dark:text-gray-400 list-decimal">
                <li>前往 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-orange-600 dark:text-orange-400 hover:underline">OpenAI Platform</a></li>
                <li>登入或註冊帳號</li>
                <li>點擊「Create new secret key」</li>
                <li>複製產生的 Key 並貼到上方</li>
              </ol>
            </details>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between">
            <button
              onClick={handleClear}
              disabled={!hasExistingKey}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清除 Key
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
