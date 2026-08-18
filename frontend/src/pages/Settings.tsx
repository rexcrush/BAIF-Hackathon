import React, { useState, useEffect } from 'react';
import { useTranslatorStore } from '../stores/translatorStore';
import { api } from '../services/api';
import LanguageBadge from '../components/shared/LanguageBadge';
import ConfirmModal from '../components/shared/ConfirmModal';
import {
  Settings as SettingsIcon,
  Server,
  Languages,
  Volume2,
  Moon,
  Sun,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';
import type { Language } from '../types';

export default function Settings() {
  const { userSettings, updateUserSettings, clearHistory, jobHistory } = useTranslatorStore();

  const [apiUrl, setApiUrl] = useState(userSettings.apiUrl || 'http://localhost:8000');
  const [defaultSource, setDefaultSource] = useState<Language>(
    userSettings.defaultSourceLanguage || 'hindi'
  );
  const [defaultTarget, setDefaultTarget] = useState<Language>(
    userSettings.defaultTargetLanguage || 'marathi'
  );
  const [autoPlayAudio, setAutoPlayAudio] = useState(userSettings.autoPlaySegmentAudio ?? true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(userSettings.theme || 'light');

  // Backend Health Test State
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    status: string;
    latencyMs: number;
    supported_languages?: string[];
  } | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);

  // Run initial health check on page load
  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setHealthError(null);
    setHealthResult(null);

    try {
      const res = await api.health();
      setHealthResult(res);
      toast.success(`Connected to offline engine! (${res.latencyMs}ms latency)`);
    } catch (e: any) {
      console.error('Health test error:', e);
      const msg = e.message || 'Cannot connect to backend engine at ' + apiUrl;
      setHealthError(msg);
      toast.error('Offline engine disconnected. Ensure uvicorn is running on port 8000.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveSettings = () => {
    updateUserSettings({
      apiUrl,
      defaultSourceLanguage: defaultSource,
      defaultTargetLanguage: defaultTarget,
      autoPlaySegmentAudio: autoPlayAudio,
      theme,
    });

    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    }

    toast.success('Settings saved successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex items-center gap-3.5 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Application Settings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Configure offline AI models, connection endpoints, and translation preferences.
          </p>
        </div>
      </div>

      {/* 1. Offline Engine & Backend Connection */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Offline Neural Backend Engine
            </h2>
          </div>
          {healthResult ? (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Engine Online ({healthResult.latencyMs}ms)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-full border border-red-200 dark:border-red-800">
              <AlertCircle className="w-3.5 h-3.5" /> Disconnected
            </span>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            FastAPI Server URL
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full sm:flex-1 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Test Connection</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Default: <code className="text-blue-600 dark:text-blue-400">http://localhost:8000</code> • The local FastAPI service orchestrating Whisper, IndicTrans2, and MMS-TTS.
          </p>
        </div>

        {healthResult && (
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
            <p className="font-semibold">
              ✓ Verified Models: Faster-Whisper (ASR) • IndicTrans2 (NMT) • MMS-TTS (Synthesis) • FFmpeg (AV)
            </p>
            <p className="opacity-80">
              Supported Language Codes: {healthResult.supported_languages?.join(', ') || 'english, hindi, marathi'}
            </p>
          </div>
        )}
      </div>

      {/* 2. Default Language Preferences */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <Languages className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Default Translation Preferences
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Default Source Language
            </label>
            <select
              value={defaultSource}
              onChange={(e) => setDefaultSource(e.target.value as Language)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-semibold cursor-pointer"
            >
              <option value="hindi">🇮🇳 Hindi (हिन्दी)</option>
              <option value="marathi">🇮🇳 Marathi (मराठी)</option>
              <option value="english">🇬🇧 English</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Default Target Language
            </label>
            <select
              value={defaultTarget}
              onChange={(e) => setDefaultTarget(e.target.value as Language)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-semibold cursor-pointer"
            >
              <option value="marathi">🇮🇳 Marathi (मराठी)</option>
              <option value="hindi">🇮🇳 Hindi (हिन्दी)</option>
              <option value="english">🇬🇧 English</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Audio Playback & Media */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <Volume2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Media & Playback Settings
          </h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Auto-play audio on segment select
            </h3>
            <p className="text-xs text-gray-400">
              Automatically play speech snippet when reviewing segments in Step 2.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoPlayAudio}
              onChange={(e) => setAutoPlayAudio(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* 4. Appearance & Theme */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <Sun className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Theme & Appearance</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', name: 'Light Mode', icon: Sun },
            { id: 'dark', name: 'Dark Mode', icon: Moon },
            { id: 'system', name: 'System Default', icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const newTheme = item.id as 'light' | 'dark' | 'system';
                  setTheme(newTheme);
                  updateUserSettings({ theme: newTheme });
                  const root = document.documentElement;
                  if (newTheme === 'dark') {
                    root.classList.add('dark');
                  } else if (newTheme === 'light') {
                    root.classList.remove('dark');
                  } else {
                    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (isDark) root.classList.add('dark');
                    else root.classList.remove('dark');
                  }
                  toast.info(`Switched to ${item.name}`);
                }}
                className={`p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Storage Management */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <HardDrive className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Local Storage & Cache</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Cached History: {jobHistory.length} translation jobs
            </h3>
            <p className="text-xs text-gray-400">
              Clear in-browser metadata and cached jobs without affecting backend files.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowClearCacheModal(true)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-300 rounded-xl text-xs font-bold border border-red-200 dark:border-red-800 transition-colors"
          >
            Clear Local Cache
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSaveSettings}
          className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all transform active:scale-95 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>Save All Settings</span>
        </button>
      </div>

      {/* Clear Cache Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearCacheModal}
        title="Clear Local Storage Cache?"
        message="This will reset your browser's cached translation jobs and preferences back to defaults."
        confirmLabel="Clear Cache"
        isDestructive={true}
        onConfirm={() => {
          clearHistory();
          setShowClearCacheModal(false);
          toast.success('Local cache cleared.');
        }}
        onCancel={() => setShowClearCacheModal(false)}
      />
    </div>
  );
}
