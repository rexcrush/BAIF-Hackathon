import React, { useState, useCallback } from 'react';
import { useTranslatorStore } from '../../stores/translatorStore';
import { api } from '../../services/api';
import {
  FileUp,
  FileText,
  Music,
  Video,
  Sparkles,
  Loader2,
  AlertCircle,
  Play,
  Languages,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import type { Language } from '../../types';

const normalizeLanguage = (lang?: string): Language => {
  if (!lang) return 'hindi';
  const clean = lang.trim().toLowerCase();
  if (clean === 'en' || clean === 'english') return 'english';
  if (clean === 'hi' || clean === 'hindi') return 'hindi';
  if (clean === 'mr' || clean === 'marathi') return 'marathi';
  return 'hindi';
};

export default function Step1_Upload() {
  const { setFormData, setCurrentStep, setCurrentJob, userSettings } = useTranslatorStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [sourceHint, setSourceHint] = useState<string>('auto');
  const [textInput, setTextInput] = useState('');
  const [isTextTranslating, setIsTextTranslating] = useState(false);

  const processUploadedFile = async (file: File) => {
    // Validation
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File exceeds maximum size limit of 500MB.');
      return;
    }

    setIsUploading(true);
    setUploadPercent(0);
    setStatusMessage('Uploading media file to engine...');
    setFormData({ inputFile: file });

    try {
      const response = await api.upload(
        file,
        sourceHint === 'auto' ? undefined : sourceHint,
        (percent) => {
          setUploadPercent(percent);
          if (percent === 100) {
            setStatusMessage('Processing audio & transcribing with Whisper AI...');
          }
        }
      );

      const data = response.data;
      const rawDetected = data.detected_language;
      const normalizedDetected = normalizeLanguage(rawDetected);
      const chosenSourceLang: Language =
        sourceHint && sourceHint !== 'auto'
          ? normalizeLanguage(sourceHint)
          : normalizedDetected;

      const defaultTarget: Language =
        userSettings.defaultTargetLanguage && userSettings.defaultTargetLanguage !== chosenSourceLang
          ? userSettings.defaultTargetLanguage
          : chosenSourceLang === 'hindi'
          ? 'english'
          : 'hindi';

      setCurrentJob({
        jobId: data.job_id,
        originalFilename: data.original_filename,
        sourceLanguage: chosenSourceLang,
        targetLanguage: defaultTarget,
        detectedLanguage: rawDetected || chosenSourceLang,
        languageConfidence: data.language_confidence,
        segments: data.segments,
        translatedSegments: [],
        outputFormats: ['text', 'subtitles'],
        outputFiles: [],
        status: 'transcribing',
        progress: 100,
        extractedAudioPath: data.extracted_audio_path,
        createdAt: new Date().toISOString(),
        isTextOnly: false,
      });

      setFormData({
        sourceLanguage: chosenSourceLang,
        targetLanguage: defaultTarget,
      });

      toast.success(
        `Transcription complete! Detected: ${chosenSourceLang.toUpperCase()} (${Math.round(
          (data.language_confidence || 1) * 100
        )}% confidence)`
      );
      setCurrentStep(2);
    } catch (error: any) {
      console.error('Upload & Transcription error:', error);
      const msg = error.response?.data?.detail || error.message || 'Failed to upload and transcribe.';
      toast.error(`Error: ${msg}. Make sure the FastAPI backend is running on localhost:8000.`);
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processUploadedFile(acceptedFiles[0]);
    }
  }, [sourceHint, userSettings]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.mkv', '.mov', '.avi'],
      'audio/*': ['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aac'],
    },
    maxSize: 500 * 1024 * 1024,
    multiple: false,
    disabled: isUploading,
  });

  // Handler for Direct Text Translation mode
  const handleDirectTextSubmit = () => {
    if (!textInput.trim()) {
      toast.warning('Please enter some text to translate.');
      return;
    }

    setIsTextTranslating(true);
    // Split sentences into segments
    const lines = textInput
      .split(/(?<=[.?!।\n])\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const segments = lines.map((line, idx) => ({
      start: idx * 3.0,
      end: (idx + 1) * 3.0,
      text: line,
    }));

    const chosenSourceLang: Language =
      sourceHint !== 'auto'
        ? normalizeLanguage(sourceHint)
        : normalizeLanguage(userSettings.defaultSourceLanguage);

    const defaultTarget: Language =
      userSettings.defaultTargetLanguage && userSettings.defaultTargetLanguage !== chosenSourceLang
        ? userSettings.defaultTargetLanguage
        : chosenSourceLang === 'hindi'
        ? 'english'
        : 'hindi';

    const jobId = `text_${Date.now()}`;
    setCurrentJob({
      jobId,
      originalFilename: 'Pasted_Text.txt',
      sourceLanguage: chosenSourceLang,
      targetLanguage: defaultTarget,
      detectedLanguage: chosenSourceLang,
      segments,
      translatedSegments: [],
      outputFormats: ['text'],
      outputFiles: [],
      status: 'idle',
      progress: 0,
      createdAt: new Date().toISOString(),
      isTextOnly: true,
    });

    setFormData({
      inputText: textInput,
      sourceLanguage: chosenSourceLang,
      targetLanguage: defaultTarget,
      outputFormats: ['text'],
    });

    toast.success('Text formatted into segments!');
    setCurrentStep(2);
    setIsTextTranslating(false);
  };

  // Helper to load sample files from backend
  const handleLoadSample = async (sampleLang: string) => {
    setSourceHint(sampleLang);
    setIsUploading(true);
    setStatusMessage(`Fetching test sample (${sampleLang})...`);
    try {
      // Backend test file endpoint or download
      const response = await fetch(`http://localhost:8000/download/test_${sampleLang}.wav`);
      if (!response.ok) {
        throw new Error(`Sample test_${sampleLang}.wav not found on backend outputs.`);
      }
      const blob = await response.blob();
      const file = new File([blob], `test_${sampleLang}.wav`, { type: 'audio/wav' });
      await processUploadedFile(file);
    } catch (e: any) {
      toast.info(`Creating demo ${sampleLang} sample text segment...`);
      // Fallback text sample
      const sampleTexts: Record<string, string> = {
        hindi: 'अरे शनिवार को बाल कटवा लिए। कई जगह हैं वो दिन शनिवार होता था।',
        marathi: 'नमस्कार! आज आम्ही नवीन उपक्रमाबद्दल चर्चा करणार आहोत.',
        english: 'Welcome to Sanskriti Sync. We help break language barriers across India.',
      };
      setTextInput(sampleTexts[sampleLang] || sampleTexts.hindi);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title & Description */}
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Upload Content for Translation
        </h2>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">
          Upload any speech audio or video file, or paste raw text. Our offline AI models will automatically transcribe and synchronize timestamps.
        </p>
      </div>

      {/* Language Hint Selection */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <Languages className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold">Source Language Hint:</span>
          <span className="text-xs text-gray-500 hidden md:inline">(Guides Whisper transcription)</span>
        </div>

        <select
          value={sourceHint}
          onChange={(e) => setSourceHint(e.target.value)}
          disabled={isUploading}
          className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer"
        >
          <option value="auto">✨ Auto-Detect (Whisper Neural Detect)</option>
          <option value="hindi">🇮🇳 Hindi (हिन्दी)</option>
          <option value="marathi">🇮🇳 Marathi (मराठी)</option>
          <option value="english">🇬🇧 English</option>
        </select>
      </div>

      {/* Drag & Drop Zone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 scale-[1.01]'
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
        } ${isUploading ? 'pointer-events-none opacity-90' : ''}`}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-5 py-6 animate-pulse">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin flex items-center justify-center"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {uploadPercent < 100 ? `Uploading (${uploadPercent}%)` : 'Transcribing Speech...'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{statusMessage}</p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-3xl mb-5 shadow-inner">
              <FileUp className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {isDragActive ? 'Drop your file right here' : 'Drag & drop audio or video file here'}
            </h3>

            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md">
              Supported Formats: <strong className="text-gray-700 dark:text-gray-300">MP4, WebM, MKV, WAV, MP3, M4A, AAC</strong> (Max 500MB)
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button
                type="button"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-500/25 transition-all transform active:scale-95 flex items-center gap-2"
              >
                <FileUp className="w-4 h-4" /> Browse Files
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Test Samples */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-900 dark:text-blue-300">
          <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>Quick Testing: Try built-in sample files</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleLoadSample('hindi')}
            disabled={isUploading}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-blue-600 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-all"
          >
            🇮🇳 Hindi Sample
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('marathi')}
            disabled={isUploading}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-blue-600 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-all"
          >
            🇮🇳 Marathi Sample
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('english')}
            disabled={isUploading}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-blue-600 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-all"
          >
            🇬🇧 English Sample
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider font-bold">
          <span className="px-4 bg-white dark:bg-gray-800 text-gray-400">or translate raw text</span>
        </div>
      </div>

      {/* Direct Text Input Section */}
      <div className="p-6 rounded-3xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Direct Text Input</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Paste paragraphs or scripts to translate without uploading media
              </p>
            </div>
          </div>
        </div>

        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste or type Hindi, Marathi, or English text here... (e.g. 'अरे शनिवार को बाल कटवा लिए।')"
          rows={4}
          className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all shadow-inner"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-400">
            {textInput.trim() ? `${textInput.trim().split(/\s+/).length} words` : '0 words'}
          </span>

          <button
            type="button"
            onClick={handleDirectTextSubmit}
            disabled={!textInput.trim() || isTextTranslating}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all ${
              textInput.trim()
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25 active:scale-95'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {isTextTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Continue with Text
          </button>
        </div>
      </div>
    </div>
  );
}
