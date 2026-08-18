import React from 'react';
import { Globe, Shield, Cpu, Sparkles, CheckCircle2, Heart, Code2 } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-8 sm:p-10 rounded-3xl shadow-xl border border-blue-800/50 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-blue-200">
          <Sparkles className="w-4 h-4 text-blue-300" />
          <span>About Sanskriti Sync v1.0</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Sanskriti Sync: Connecting Cultures & Languages
        </h1>
        <p className="text-sm sm:text-base text-blue-100/80 max-w-2xl leading-relaxed">
          An open-source, fully offline neural translation and localization studio designed for organizations, educators, and field creators to transcribe, translate, subtitle, and dub video content across English, Hindi, and Marathi.
        </p>
      </div>

      {/* Model Stack */}
      <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Under the Hood: Offline Neural Architecture
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Speech Recognition (ASR)
            </span>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Faster-Whisper</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              OpenAI Whisper optimized with CTranslate2. Performs automatic speech-to-text with millisecond timestamp extraction.
            </p>
          </div>

          <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
              Neural Machine Translation
            </span>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">IndicTrans2 (AI4Bharat)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              State-of-the-art transformer translation model specifically trained on Indian languages, capturing regional dialects and nuanced phrasing.
            </p>
          </div>

          <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Speech Synthesis (TTS)
            </span>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Meta MMS-TTS</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Massively Multilingual Speech text-to-speech models producing natural voices in Hindi, Marathi, and English.
            </p>
          </div>

          <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Audio/Video Processing
            </span>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">FFmpeg + Libav</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Native media processing pipeline for audio extraction, timestamped audio concatenation, and hard-burning styled subtitles onto video frames.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy & Impact */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Privacy Guarantee</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            All models run 100% offline on your device (`localhost`). No telemetry, no cloud APIs, and no data tracking. Audio recordings and sensitive NGO field footage never leave your machine.
          </p>
        </div>

        <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
            <Code2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Open Source & Extensible</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Built using modern React 18, Vite, Tailwind CSS, Zustand, and FastAPI. Packagable as a portable desktop application with PyInstaller.
          </p>
        </div>
      </div>
    </div>
  );
}
