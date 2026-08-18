import React, { useState, useEffect } from 'react';
import { useTranslatorStore } from '../../stores/translatorStore';
import { api } from '../../services/api';
import AudioPlayer from '../../components/shared/AudioPlayer';
import LanguageBadge from '../../components/shared/LanguageBadge';
import ConfirmModal from '../../components/shared/ConfirmModal';
import {
  Play,
  Check,
  Edit3,
  Save,
  X,
  Trash2,
  Plus,
  Search,
  Volume2,
  ArrowRight,
  Info,
  Mic,
  Lock,
} from 'lucide-react';
import { toast } from 'react-toastify';
import type { Language } from '../../types';

interface LanguageOption {
  id: Language;
  name: string;
  nativeName: string;
  flag: string;
  desc: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    id: 'hindi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    desc: 'Devanagari script • Most spoken across Northern & Central India',
  },
  {
    id: 'marathi',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    desc: 'Maharashtra state official language • Devanagari script',
  },
  {
    id: 'english',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    desc: 'International English • Latin script',
  },
];

const normalizeLanguage = (lang?: string): Language => {
  if (!lang) return 'hindi';
  const clean = lang.trim().toLowerCase();
  if (clean === 'en' || clean === 'english') return 'english';
  if (clean === 'hi' || clean === 'hindi') return 'hindi';
  if (clean === 'mr' || clean === 'marathi') return 'marathi';
  return 'hindi';
};

export default function Step2_Transcription() {
  const {
    currentJob,
    setCurrentStep,
    formData,
    setFormData,
    updateSegment,
    deleteSegment,
    addSegment,
    searchAndReplace,
  } = useTranslatorStore();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [activePlaySegment, setActivePlaySegment] = useState<{ start: number; end: number } | null>(
    null
  );

  // Search and replace states
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');

  // Add segment modal
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [newStart, setNewStart] = useState(0);
  const [newEnd, setNewEnd] = useState(3);
  const [newText, setNewText] = useState('');

  // Delete segment confirmation
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const sourceLang = formData.sourceLanguage;
  const targetLang = formData.targetLanguage;

  // Auto-synchronize source language from currentJob upon entry and ensure valid target
  useEffect(() => {
    const rawSource = currentJob?.sourceLanguage || currentJob?.detectedLanguage;
    if (rawSource) {
      const jobSource = normalizeLanguage(rawSource);
      const updates: Partial<typeof formData> = {};
      if (formData.sourceLanguage !== jobSource) {
        updates.sourceLanguage = jobSource;
      }
      if (formData.targetLanguage === jobSource) {
        const alternativeTarget = jobSource === 'hindi' ? 'english' : 'hindi';
        updates.targetLanguage = alternativeTarget;
      }
      if (Object.keys(updates).length > 0) {
        setFormData(updates);
      }
    }
  }, [currentJob?.sourceLanguage, currentJob?.detectedLanguage]);

  if (!currentJob) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-gray-500">No active job found. Please upload a file first.</p>
        <button
          onClick={() => setCurrentStep(1)}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  // Audio source URL for the uploaded job
  const audioUrl = currentJob.jobId
    ? api.getMediaUrl(`${currentJob.jobId}_audio.wav`)
    : '';

  const handleStartEdit = (index: number, text: string) => {
    setEditingIndex(index);
    setEditText(text);
  };

  const handleSaveEdit = (index: number) => {
    if (!editText.trim()) {
      toast.warning('Segment text cannot be empty.');
      return;
    }
    updateSegment(index, editText.trim());
    setEditingIndex(null);
    toast.success('Segment updated!');
  };

  const handlePlaySegment = (start: number, end: number) => {
    setActivePlaySegment({ start, end });
  };

  const handleAddSegmentSubmit = () => {
    if (!newText.trim()) {
      toast.warning('Segment text is required.');
      return;
    }
    if (newEnd <= newStart) {
      toast.warning('End time must be greater than start time.');
      return;
    }

    addSegment({
      start: newStart,
      end: newEnd,
      text: newText.trim(),
    });

    setNewText('');
    setShowAddSegment(false);
    toast.success('New segment added!');
  };

  const handleSearchReplaceSubmit = () => {
    if (!searchTerm) {
      toast.warning('Please enter search term.');
      return;
    }
    searchAndReplace(searchTerm, replaceTerm);
    toast.success(`Replaced "${searchTerm}" with "${replaceTerm}".`);
    setSearchTerm('');
    setReplaceTerm('');
    setShowSearch(false);
  };

  const handleExportSrt = () => {
    const srtContent = currentJob.segments
      .map((seg, i) => `${i + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.text}\n`)
      .join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentJob.jobId}_transcript.srt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded transcript as .srt');
  };

  const handleExportTxt = () => {
    const txtContent = currentJob.segments.map((seg) => seg.text).join('\n');
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentJob.jobId}_transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded transcript as .txt');
  };

  const handleSpeakText = (text: string, lang: Language) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (lang === 'hindi') utterance.lang = 'hi-IN';
      else if (lang === 'marathi') utterance.lang = 'mr-IN';
      else utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
      toast.info(`Speaking text via speech preview...`);
    } else {
      toast.warning('Speech synthesis is not supported on this browser.');
    }
  };

  const handleSelectTargetLanguage = (langId: Language) => {
    if (langId === sourceLang) {
      toast.info('Target language must be different from source language.');
      return;
    }
    setFormData({ targetLanguage: langId });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Review Transcript & Select Target Language
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Verify and edit the speech-to-text transcription, then choose your desired target language below.
        </p>
      </div>

      {/* Helpful Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/60 shadow-xs">
        <div className="p-1.5 bg-blue-600 text-white rounded-xl flex-shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-bold">
            Audio verification:
          </p>
          <p className="text-blue-800/90 dark:text-blue-300 leading-relaxed">
            The audio player plays your <strong>original speaker recording</strong> so you can cross-check transcript accuracy. If you edit any text, click the <Volume2 className="w-3.5 h-3.5 inline text-blue-600 dark:text-blue-400 mx-0.5" /> speaker icon on any segment to hear the updated words pronounced.
          </p>
        </div>
      </div>

      {/* Header Info & Audio Player */}
      {!currentJob.isTextOnly && audioUrl && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Original Source Audio
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-xs block">
                  {currentJob.originalFilename}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Detected Language:</span>
              <LanguageBadge language={sourceLang} size="md" />
              {currentJob.languageConfidence && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {Math.round(currentJob.languageConfidence * 100)}% Match
                </span>
              )}
            </div>
          </div>

          <AudioPlayer
            src={audioUrl}
            startTime={activePlaySegment?.start}
            endTime={activePlaySegment?.end}
            label={activePlaySegment ? `Playing Segment (${formatTime(activePlaySegment.start)} - ${formatTime(activePlaySegment.end)})` : 'Full Audio Preview'}
          />
        </div>
      )}

      {/* Transcript Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-gray-900 dark:text-white">
            Transcript Segments ({currentJob.segments.length})
          </span>
          <span className="text-xs text-gray-500 font-normal">
            (Click text or edit icon to modify)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showSearch
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search & Replace</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddSegment(true)}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Add Segment</span>
          </button>

          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
            <button
              type="button"
              onClick={handleExportSrt}
              className="px-2 py-1 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Download original transcript as .srt"
            >
              .SRT
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              type="button"
              onClick={handleExportTxt}
              className="px-2 py-1 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Download original transcript as .txt"
            >
              .TXT
            </button>
          </div>
        </div>
      </div>

      {/* Search & Replace Panel */}
      {showSearch && (
        <div className="p-4 bg-blue-50/80 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
              Search & Replace Across All Segments
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
              placeholder="Find text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              className="p-2.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSearchReplaceSubmit}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              Replace All
            </button>
          </div>
        </div>
      )}

      {/* Segments Review List */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {currentJob.segments.map((segment, index) => {
          const isEditing = editingIndex === index;
          const isPlayingThis =
            activePlaySegment?.start === segment.start &&
            activePlaySegment?.end === segment.end;

          return (
            <div
              key={index}
              className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                isPlayingThis
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 shadow-xs'
              }`}
            >
              {/* Index & Timestamp */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>

                <div className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  {formatTime(segment.start)} → {formatTime(segment.end)}
                </div>

                {!currentJob.isTextOnly && audioUrl && (
                  <button
                    type="button"
                    onClick={() => handlePlaySegment(segment.start, segment.end)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isPlayingThis
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-600'
                    }`}
                    title="Play original audio segment"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSpeakText(segment.text, sourceLang)}
                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                  title="Listen to edited text via speech synthesis"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Segment Content / Editor */}
              <div className="flex-1 w-full sm:w-auto">
                {isEditing ? (
                  <div className="flex items-center gap-2">
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
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-blue-500 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(index)}
                        className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        title="Save (Ctrl+Enter)"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    onClick={() => handleStartEdit(index, segment.text)}
                    className="text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-relaxed font-medium"
                    title="Click to edit segment text"
                  >
                    {segment.text}
                  </p>
                )}
              </div>

              {/* Actions */}
              {!isEditing && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(index, segment.text)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Edit segment text"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteIndex(index)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Delete segment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Target Language Selection Section */}
      <div className="pt-8 border-t border-gray-200 dark:border-gray-700 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Select Target Translation Language
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Source language is locked to your speech recording. Select the target language for IndicTrans2 translation in Step 3.
          </p>
        </div>

        {/* Source and Target Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-center">
          {/* Source Language Card (Locked) */}
          <div className="p-5 rounded-3xl border-2 border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/60 shadow-sm space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Source Speech Language
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" /> Locked from Audio
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {LANGUAGES.find((l) => l.id === sourceLang)?.flag || '🇮🇳'}
              </span>
              <div>
                <h4 className="font-black text-lg text-gray-900 dark:text-white">
                  {LANGUAGES.find((l) => l.id === sourceLang)?.name || 'Hindi'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {LANGUAGES.find((l) => l.id === sourceLang)?.nativeName || 'हिन्दी'} • {LANGUAGES.find((l) => l.id === sourceLang)?.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Target Language Options */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block px-1">
              Choose Target Output Language:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LANGUAGES.filter((l) => l.id !== sourceLang).map((lang) => {
                const isSelected = targetLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => handleSelectTargetLanguage(lang.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-500/20 shadow-md scale-[1.02]'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-2xl">{lang.flag}</span>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-bold text-sm text-gray-900 dark:text-white">
                        {lang.name}
                      </h5>
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold block">
                        {lang.nativeName}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
        >
          ← Back to Upload
        </button>

        <button
          type="button"
          onClick={() => {
            if (currentJob.segments.length === 0) {
              toast.error('Please have at least one segment before continuing.');
              return;
            }
            if (sourceLang === targetLang) {
              toast.error('Please choose a target language different from source.');
              return;
            }
            setCurrentStep(3);
          }}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all transform active:scale-95 text-sm sm:text-base"
        >
          <span>Proceed to Translation Review</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Add Segment Modal */}
      {showAddSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Speech Segment</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Start Time (sec)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newStart}
                  onChange={(e) => setNewStart(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">End Time (sec)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newEnd}
                  onChange={(e) => setNewEnd(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Transcript Text</label>
              <textarea
                rows={3}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Enter transcript sentence..."
                className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddSegment(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSegmentSubmit}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm"
              >
                Add Segment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteIndex !== null}
        title="Delete Segment?"
        message="Are you sure you want to remove this transcription segment from the translation workflow?"
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={() => {
          if (deleteIndex !== null) {
            deleteSegment(deleteIndex);
            setDeleteIndex(null);
            toast.info('Segment removed.');
          }
        }}
        onCancel={() => setDeleteIndex(null)}
      />
    </div>
  );
}

function formatTime(seconds: number) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${pad(m)}:${pad(s)}.${ms}`;
}

function formatSrtTime(seconds: number) {
  const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}
