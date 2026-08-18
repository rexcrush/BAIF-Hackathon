import React, { useState, useEffect, useRef } from 'react';
import { useTranslatorStore } from '../../stores/translatorStore';
import { api } from '../../services/api';
import AudioPlayer from '../../components/shared/AudioPlayer';
import LanguageBadge from '../../components/shared/LanguageBadge';
import {
  FileText,
  Subtitles,
  Mic2,
  Settings2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
  Sparkles,
  Edit3,
  Save,
  X,
  Search,
  Volume2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Play,
  VolumeX,
} from 'lucide-react';
import { toast } from 'react-toastify';
import type { OutputFormat, Language, TranslatedSegment } from '../../types';

export default function Step3_Languages() {
  const {
    formData,
    setFormData,
    setCurrentStep,
    currentJob,
    updateCurrentJob,
    updateTranslatedSegment,
    searchAndReplaceTranslated,
  } = useTranslatorStore();

  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Segment editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [retranslatingIndex, setRetranslatingIndex] = useState<number | null>(null);

  // Search and replace state
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');

  // Audio preview state
  const [activePlaySegment, setActivePlaySegment] = useState<{ start: number; end: number } | null>(null);

  // Translated voice playback state
  const [playingAudioIndex, setPlayingAudioIndex] = useState<number | null>(null);
  const [loadingAudioIndex, setLoadingAudioIndex] = useState<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const sourceLang = formData.sourceLanguage;
  const targetLang = formData.targetLanguage;
  const audioUrl = currentJob?.extractedAudioPath ? api.getMediaUrl(`${currentJob.jobId}_audio.wav`) : null;

  // Format timestamp helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // Run initial batch translation when entering Step 3 if not yet translated for this target lang
  useEffect(() => {
    let isMounted = true;

    const translateAll = async () => {
      if (!currentJob || !currentJob.segments || currentJob.segments.length === 0) return;

      // Check if already translated for this exact target language and segment count
      if (
        currentJob.translatedSegments &&
        currentJob.translatedSegments.length === currentJob.segments.length &&
        currentJob.targetLanguage === targetLang
      ) {
        return;
      }

      setIsTranslating(true);
      setTranslationError(null);

      try {
        const res = await api.translateSegments(
          currentJob.jobId,
          currentJob.segments,
          sourceLang,
          targetLang
        );

        if (isMounted) {
          const translatedSegs: TranslatedSegment[] = res.data.segments.map((s, idx) => ({
            ...currentJob.segments[idx],
            original_text: s.original_text || currentJob.segments[idx]?.text || '',
            translated_text: s.translated_text,
            text: s.translated_text,
          }));

          updateCurrentJob({
            targetLanguage: targetLang,
            translatedSegments: translatedSegs,
          });
          toast.success(`Translated ${translatedSegs.length} segments with IndicTrans2!`);
        }
      } catch (err: any) {
        console.error('Translation error:', err);
        if (isMounted) {
          const msg = err?.response?.data?.detail || err.message || 'Failed to translate segments.';
          setTranslationError(msg);
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setIsTranslating(false);
        }
      }
    };

    translateAll();

    return () => {
      isMounted = false;
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, [currentJob?.jobId, targetLang, sourceLang]);

  // Handle re-translating all segments
  const handleRetranslateAll = async () => {
    if (!currentJob?.segments) return;
    setIsTranslating(true);
    setTranslationError(null);

    try {
      const res = await api.translateSegments(
        currentJob.jobId,
        currentJob.segments,
        sourceLang,
        targetLang
      );

      const translatedSegs: TranslatedSegment[] = res.data.segments.map((s, idx) => ({
        ...currentJob.segments[idx],
        original_text: s.original_text || currentJob.segments[idx]?.text || '',
        translated_text: s.translated_text,
        text: s.translated_text,
      }));

      updateCurrentJob({
        targetLanguage: targetLang,
        translatedSegments: translatedSegs,
      });
      toast.success('Re-translated all segments!');
    } catch (err: any) {
      toast.error('Re-translation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle re-translating a single segment
  const handleRetranslateSingle = async (index: number, originalText: string) => {
    setRetranslatingIndex(index);
    try {
      const res = await api.translateText(originalText, sourceLang, targetLang);
      updateTranslatedSegment(index, res.data.translated_text);
      toast.success(`Re-translated segment #${index + 1}`);
    } catch (err: any) {
      toast.error('Could not re-translate segment.');
    } finally {
      setRetranslatingIndex(null);
    }
  };

  // Save segment edit
  const handleStartEdit = (index: number, text: string) => {
    setEditingIndex(index);
    setEditText(text);
  };

  const handleSaveEdit = (index: number) => {
    if (!editText.trim()) {
      toast.warning('Translated text cannot be empty.');
      return;
    }
    updateTranslatedSegment(index, editText.trim());
    setEditingIndex(null);
    toast.success(`Updated segment #${index + 1} translation!`);
  };

  // Play translated audio using backend MMS-TTS neural voice + speech synthesis fallback
  const handlePlayTranslatedVoice = async (index: number, text: string, lang: Language) => {
    if (!text.trim()) return;

    // If currently playing this index, pause it
    if (playingAudioIndex === index && activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      setPlayingAudioIndex(null);
      return;
    }

    // Stop any existing playback
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      setPlayingAudioIndex(null);
    }

    setLoadingAudioIndex(index);
    try {
      // 1. Try MMS-TTS neural preview from backend
      const res = await api.ttsPreview(text, lang);
      const soundUrl = api.getMediaUrl(res.data.audio_filename);
      const audio = new Audio(soundUrl);
      activeAudioRef.current = audio;

      audio.onplay = () => {
        setLoadingAudioIndex(null);
        setPlayingAudioIndex(index);
      };
      audio.onended = () => {
        setPlayingAudioIndex(null);
        activeAudioRef.current = null;
      };
      audio.onerror = () => {
        playBrowserSpeechFallback(text, lang, index);
      };

      await audio.play();
      toast.info(`Playing MMS neural voice (${lang})...`);
    } catch (err) {
      console.warn('Backend MMS-TTS preview fallback:', err);
      playBrowserSpeechFallback(text, lang, index);
    } finally {
      setLoadingAudioIndex(null);
    }
  };

  const playBrowserSpeechFallback = (text: string, lang: Language, index: number) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (lang === 'hindi') utterance.lang = 'hi-IN';
      else if (lang === 'marathi') utterance.lang = 'mr-IN';
      else utterance.lang = 'en-US';
      utterance.onstart = () => setPlayingAudioIndex(index);
      utterance.onend = () => setPlayingAudioIndex(null);
      utterance.onerror = () => setPlayingAudioIndex(null);
      window.speechSynthesis.speak(utterance);
      toast.info(`Speaking text via preview (${lang})...`);
    } else {
      toast.warning('Audio playback is not supported on this browser.');
    }
  };

  // Search & Replace
  const handleSearchReplaceSubmit = () => {
    if (!searchTerm) {
      toast.warning('Please enter search term.');
      return;
    }
    searchAndReplaceTranslated(searchTerm, replaceTerm);
    toast.success(`Replaced "${searchTerm}" with "${replaceTerm}" across translations.`);
    setSearchTerm('');
    setReplaceTerm('');
    setShowSearch(false);
  };

  // Toggle output formats
  const toggleFormat = (format: OutputFormat) => {
    const current = formData.outputFormats;
    if (current.includes(format)) {
      if (current.length === 1) {
        toast.info('At least one output format must be selected.');
        return;
      }
      setFormData({ outputFormats: current.filter((f) => f !== format) });
    } else {
      setFormData({ outputFormats: [...current, format] });
    }
  };

  const segmentCount = currentJob?.segments?.length || 5;

  // Calculate dynamic estimated time for Step 4 processing
  const calculateEstimatedTime = () => {
    let seconds = 2;
    if (formData.outputFormats.includes('text')) seconds += 1;
    if (formData.outputFormats.includes('subtitles')) seconds += segmentCount * 1.0 + 5;
    if (formData.outputFormats.includes('dubbing')) seconds += segmentCount * 2.2 + 10;

    const mins = Math.floor(seconds / 60);
    const remainingSecs = Math.round(seconds % 60);
    if (mins > 0) return `~${mins} min ${remainingSecs} sec`;
    return `~${remainingSecs} seconds`;
  };

  const translatedSegments = currentJob?.translatedSegments || [];

  return (
    <div className="space-y-10 animate-fadeIn pb-6">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Review Translation & Configure Outputs
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Review the neural translation for each segment. Edit any wording, listen to the target pronunciation with MMS-TTS voice, and select deliverable outputs below.
        </p>
      </div>

      {/* Language Header & Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-purple-900/10 via-indigo-900/5 to-blue-900/10 dark:from-purple-950/40 dark:to-blue-950/40 rounded-3xl border border-purple-200/80 dark:border-purple-800/60 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600 text-white rounded-2xl shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Language Pair:
              </span>
              <div className="flex items-center gap-1.5">
                <LanguageBadge language={sourceLang} size="sm" />
                <span className="text-gray-400 font-bold">→</span>
                <LanguageBadge language={targetLang} size="sm" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Powered by AI4Bharat IndicTrans2 Neural Machine Translation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showSearch
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search & Replace</span>
          </button>

          <button
            type="button"
            onClick={handleRetranslateAll}
            disabled={isTranslating}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Re-run neural translation on all segments"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-600 ${isTranslating ? 'animate-spin' : ''}`} />
            <span>Re-translate All</span>
          </button>
        </div>
      </div>

      {/* Search & Replace Panel */}
      {showSearch && (
        <div className="p-4 bg-purple-50/80 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
              Search & Replace in Translations
            </span>
            <button
              onClick={() => setShowSearch(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
            >
              Close
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Find translated text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2.5 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-xl text-xs"
            />
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              className="p-2.5 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-xl text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSearchReplaceSubmit}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              Replace All in Translations
            </button>
          </div>
        </div>
      )}

      {/* Audio Player Bar (if audio available) */}
      {!currentJob?.isTextOnly && audioUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold px-1">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-purple-600" /> Audio Reference Track (Original Speaker)
            </span>
            <span>Click play on any segment to listen to original audio</span>
          </div>
          <AudioPlayer
            src={audioUrl}
            startTime={activePlaySegment?.start}
            endTime={activePlaySegment?.end}
            label={activePlaySegment ? `Playing Segment: ${formatTime(activePlaySegment.start)} - ${formatTime(activePlaySegment.end)}` : 'Master Audio Track Preview'}
          />
        </div>
      )}

      {/* Section 1: Translation Review Segments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <span>Translated Segments ({translatedSegments.length})</span>
            <span className="text-xs font-normal text-gray-500">
              (Click text or edit icon to refine translation)
            </span>
          </h3>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Review
          </span>
        </div>

        {/* Translation Loading State */}
        {isTranslating ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <h4 className="font-bold text-gray-900 dark:text-white text-base">
                Translating Segments with IndicTrans2...
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Running neural machine translation from {sourceLang} to {targetLang}. This takes ~5-15 seconds.
              </p>
            </div>
          </div>
        ) : translationError ? (
          <div className="p-6 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-bold text-sm">Translation Failed</span>
            </div>
            <p className="text-xs">{translationError}</p>
            <button
              type="button"
              onClick={handleRetranslateAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
            >
              Retry Translation
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm divide-y divide-gray-100 dark:divide-gray-700/60 overflow-hidden">
            {translatedSegments.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No segments found to translate. Please return to Step 1.
              </div>
            ) : (
              translatedSegments.map((segment, index) => {
                const isEditing = editingIndex === index;
                const isPlayingOriginal =
                  activePlaySegment?.start === segment.start &&
                  activePlaySegment?.end === segment.end;
                const isRetranslatingThis = retranslatingIndex === index;
                const isPlayingTranslated = playingAudioIndex === index;
                const isLoadingVoice = loadingAudioIndex === index;

                return (
                  <div
                    key={index}
                    className={`p-4 sm:p-5 transition-colors grid md:grid-cols-12 gap-4 items-start ${
                      isPlayingOriginal || isPlayingTranslated
                        ? 'bg-purple-50/60 dark:bg-purple-950/30 border-l-4 border-l-purple-600'
                        : 'hover:bg-gray-50/80 dark:hover:bg-gray-750'
                    }`}
                  >
                    {/* Index & Timestamp (2 cols) */}
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center text-[10px] font-bold">
                          {index + 1}
                        </span>
                        <span className="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {formatTime(segment.start)}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        Duration: {Math.max(0.1, Math.round((segment.end - segment.start) * 10) / 10)}s
                      </span>

                      {!currentJob?.isTextOnly && audioUrl && (
                        <button
                          type="button"
                          onClick={() => setActivePlaySegment({ start: segment.start, end: segment.end })}
                          className={`mt-1 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 w-fit transition-all ${
                            isPlayingOriginal
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-100 hover:text-purple-700'
                          }`}
                          title="Listen to original speaker recording"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Original Audio</span>
                        </button>
                      )}
                    </div>

                    {/* Original Source Text (5 cols) */}
                    <div className="md:col-span-5 p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Original ({sourceLang})
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePlayTranslatedVoice(index, segment.original_text || segment.text, sourceLang)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-0.5"
                          title="Listen to source text"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                        {segment.original_text || segment.text}
                      </p>
                    </div>

                    {/* Translated Text (5 cols) */}
                    <div className="md:col-span-5 p-3.5 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-200/90 dark:border-purple-800/60 space-y-1.5 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Translation ({targetLang})</span>
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Neural Voice Playback Button */}
                          <button
                            type="button"
                            onClick={() => handlePlayTranslatedVoice(index, segment.translated_text, targetLang)}
                            disabled={isLoadingVoice}
                            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold ${
                              isPlayingTranslated
                                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400'
                                : isLoadingVoice
                                ? 'bg-purple-200 text-purple-800 animate-pulse'
                                : 'text-purple-600 dark:text-purple-400 hover:text-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                            }`}
                            title={`Listen to neural TTS in ${targetLang}`}
                          >
                            {isLoadingVoice ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isPlayingTranslated ? (
                              <VolumeX className="w-3.5 h-3.5" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                            <span className="text-[10px] hidden sm:inline">
                              {isPlayingTranslated ? 'Stop' : 'Listen'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRetranslateSingle(index, segment.original_text || segment.text)}
                            disabled={isRetranslatingThis}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 p-1 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                            title="Re-translate this single segment"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRetranslatingThis ? 'animate-spin' : ''}`} />
                          </button>

                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(index, segment.translated_text)}
                              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 p-1 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                              title="Edit this translation"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1 animate-fadeIn">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                handleSaveEdit(index);
                              } else if (e.key === 'Escape') {
                                setEditingIndex(null);
                              }
                            }}
                            autoFocus
                            rows={2}
                            className="w-full p-2.5 bg-white dark:bg-gray-900 border-2 border-purple-500 rounded-xl text-xs sm:text-sm font-medium focus:outline-none shadow-sm"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(index)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all"
                            >
                              <Save className="w-3 h-3" /> Save (Ctrl+Enter)
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingIndex(null)}
                              className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          onClick={() => handleStartEdit(index, segment.translated_text)}
                          className="text-xs sm:text-sm text-purple-950 dark:text-purple-200 leading-relaxed font-semibold cursor-pointer hover:text-purple-600 transition-colors"
                          title="Click to edit translation"
                        >
                          {segment.translated_text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Section 2: Output Deliverables Options */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Choose Output Deliverables
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select what you want to produce with your approved translations. Multiple options can be selected.
          </p>
        </div>

        {/* Output Format Cards */}
        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {/* Card 1: Text & Subtitle Files */}
          <div
            onClick={() => toggleFormat('text')}
            className={`p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
              formData.outputFormats.includes('text')
                ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20 scale-[1.02]'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3.5 bg-blue-100 dark:bg-blue-900/40 rounded-2xl text-blue-600 dark:text-blue-400">
                  <FileText className="w-7 h-7" />
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    formData.outputFormats.includes('text')
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {formData.outputFormats.includes('text') && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">Translated Text & SRT</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Download formatted subtitle (.srt), structured data (.json), and raw translated text (.txt).
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded-md">
                  .SRT Subtitle
                </span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded-md">
                  .JSON Data
                </span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded-md">
                  .TXT Script
                </span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Instant (~2s)
            </div>
          </div>

          {/* Card 2: Burned Video Subtitles */}
          <div
            onClick={() => toggleFormat('subtitles')}
            className={`p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
              formData.outputFormats.includes('subtitles')
                ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 shadow-lg shadow-purple-500/10 ring-2 ring-purple-500/20 scale-[1.02]'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3.5 bg-purple-100 dark:bg-purple-900/40 rounded-2xl text-purple-600 dark:text-purple-400">
                  <Subtitles className="w-7 h-7" />
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    formData.outputFormats.includes('subtitles')
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {formData.outputFormats.includes('subtitles') && (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">Burn-in Subtitles</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Generates a video file with hardcoded translated subtitles burned directly into the frames.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-[10px] font-bold rounded-md">
                  Hardcoded MP4
                </span>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-[10px] font-bold rounded-md">
                  Custom Styling
                </span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Re-encoded video
            </div>
          </div>

          {/* Card 3: AI Voice Dubbing */}
          <div
            onClick={() => toggleFormat('dubbing')}
            className={`p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
              formData.outputFormats.includes('dubbing')
                ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20 scale-[1.02]'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <Mic2 className="w-7 h-7" />
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    formData.outputFormats.includes('dubbing')
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {formData.outputFormats.includes('dubbing') && (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">AI Voice Dubbing</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Generates MMS neural synthetic speech in target language aligned with timestamps, then muxes into video.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-md">
                  MMS Neural TTS
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-md">
                  Timing Muxing
                </span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Full Audio Synthesis
            </div>
          </div>
        </div>

        {/* Subtitle / Dubbing Configuration Drawer */}
        {(formData.outputFormats.includes('subtitles') || formData.outputFormats.includes('dubbing')) && (
          <div className="p-6 bg-gray-50/90 dark:bg-gray-900/50 rounded-3xl border border-gray-200 dark:border-gray-700 max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <Settings2 className="w-5 h-5 text-blue-600" />
              <span>Output Configuration & Style</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {formData.outputFormats.includes('subtitles') && (
                <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Subtitle Font Size
                    </label>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                      {formData.subtitleSettings.fontSize}px
                    </span>
                  </div>

                  <input
                    type="range"
                    min="14"
                    max="32"
                    step="2"
                    value={formData.subtitleSettings.fontSize}
                    onChange={(e) =>
                      setFormData({
                        subtitleSettings: {
                          ...formData.subtitleSettings,
                          fontSize: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-blue-600 cursor-pointer"
                  />

                  <div className="p-3 bg-black rounded-xl text-center">
                    <span
                      style={{ fontSize: `${formData.subtitleSettings.fontSize}px` }}
                      className="text-white font-semibold"
                    >
                      {translatedSegments[0]?.translated_text || 'अरे, शनिवारी केस कापून घ्या'}
                    </span>
                  </div>
                </div>
              )}

              {formData.outputFormats.includes('dubbing') && (
                <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Voice Synthesis Engine
                  </label>

                  <select
                    value={formData.dubSettings.voiceQuality}
                    onChange={(e) =>
                      setFormData({
                        dubSettings: {
                          ...formData.dubSettings,
                          voiceQuality: e.target.value as any,
                        },
                      })
                    }
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium"
                  >
                    <option value="standard">Standard (Meta MMS-TTS Neural Model)</option>
                    <option value="high">High Definition (Enhanced Acoustic Mux)</option>
                  </select>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Audio tracks are automatically aligned with the original speech segment timestamps.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/30 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-purple-900 dark:text-purple-300">
            <Info className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>
              Estimated processing time for {segmentCount} segments:{' '}
              <strong className="font-bold text-purple-700 dark:text-purple-200">{calculateEstimatedTime()}</strong>
            </span>
          </div>

          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
            {formData.outputFormats.length} deliverable formats selected
          </span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
        >
          ← Back to Transcript & Languages
        </button>

        <button
          type="button"
          disabled={isTranslating || translatedSegments.length === 0}
          onClick={() => {
            if (formData.outputFormats.length === 0) {
              toast.error('Please select at least one output format.');
              return;
            }
            setCurrentStep(4);
          }}
          className={`px-10 py-3.5 rounded-2xl font-black shadow-lg flex items-center gap-2 transition-all transform active:scale-95 text-base ${
            !isTranslating && translatedSegments.length > 0
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-purple-500/25 cursor-pointer'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Approve Translation & Generate Deliverables</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
