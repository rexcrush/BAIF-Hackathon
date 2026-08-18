import React, { useState, useEffect, useRef } from 'react';
import { useTranslatorStore } from '../../stores/translatorStore';
import { api } from '../../services/api';
import VideoPlayer from '../../components/shared/VideoPlayer';
import LanguageBadge from '../../components/shared/LanguageBadge';
import {
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Loader2,
  FileText,
  Subtitles,
  Mic2,
  Share2,
  RefreshCw,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import type { OutputFile, TranslatedSegment } from '../../types';

interface StageInfo {
  id: string;
  name: string;
  desc: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

export default function Step4_Output() {
  const {
    currentJob,
    formData,
    setCurrentJob,
    updateCurrentJob,
    addToHistory,
    setCurrentStep,
    reset,
  } = useTranslatorStore();

  const [stages, setStages] = useState<StageInfo[]>([
    {
      id: 'translate',
      name: 'Saving Approved Translations',
      desc: 'Synchronizing edited translations with backend SRT subtitles',
      status: 'pending',
    },
    {
      id: 'subtitles',
      name: 'Generating Subtitles Video',
      desc: 'Burning styled subtitles onto video stream with FFmpeg',
      status: 'pending',
    },
    {
      id: 'dubbing',
      name: 'AI Neural Voice Dubbing',
      desc: 'Synthesizing target audio track with MMS-TTS & muxing with video',
      status: 'pending',
    },
  ]);

  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStageText, setCurrentStageText] = useState('Initializing generation pipeline...');
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<OutputFile | null>(null);
  const [showSegmentDetails, setShowSegmentDetails] = useState(false);

  // Time tracking
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hasExecutedRef = useRef(false);

  // Elapsed timer
  useEffect(() => {
    let timer: any;
    if (!isDone && !errorMsg) {
      timer = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isDone, errorMsg]);

  // Main Pipeline Runner
  const runPipeline = async () => {
    if (!currentJob) return;

    setErrorMsg(null);
    setIsDone(false);
    setOverallProgress(5);
    hasExecutedRef.current = true;

    const formats = formData.outputFormats;
    const isTextOnly = currentJob.isTextOnly;
    const generatedFiles: OutputFile[] = [];
    let translatedSegs: TranslatedSegment[] = [];
    let srtFileName = '';

    // Filter relevant stages
    const activeStages: StageInfo[] = [
      {
        id: 'translate',
        name: 'Saving Approved Translations',
        desc: `Confirming ${currentJob.segments.length} segments (${formData.sourceLanguage} → ${formData.targetLanguage})`,
        status: 'running',
      },
    ];

    if (!isTextOnly && formats.includes('subtitles')) {
      activeStages.push({
        id: 'subtitles',
        name: 'Hard-Burn Subtitles Video',
        desc: 'Encoding video frames with styled subtitle overlay',
        status: 'pending',
      });
    }

    if (!isTextOnly && formats.includes('dubbing')) {
      activeStages.push({
        id: 'dubbing',
        name: 'AI Neural Voice Dubbing',
        desc: 'Synthesizing target audio track & muxing with video',
        status: 'pending',
      });
    }

    setStages(activeStages);

    try {
      // ==========================================
      // STAGE 1: Confirm & Save Approved Translations
      // ==========================================
      setCurrentStageText(`Preparing ${currentJob.segments.length} approved translated segments...`);
      setOverallProgress(25);

      if (currentJob.translatedSegments && currentJob.translatedSegments.length > 0) {
        translatedSegs = currentJob.translatedSegments;
        srtFileName = `${currentJob.jobId}_${formData.targetLanguage.toLowerCase()}.srt`;
        // Save user's approved/edited translations to backend SRT for burning
        await api.saveSrt(
          currentJob.jobId,
          formData.targetLanguage,
          translatedSegs.map((s) => ({
            start: s.start,
            end: s.end,
            text: s.translated_text || s.text,
          }))
        );
      } else {
        const translateRes = await api.translateSegments(
          currentJob.jobId,
          currentJob.segments,
          formData.sourceLanguage,
          formData.targetLanguage
        );
        translatedSegs = translateRes.data.segments;
        srtFileName = translateRes.data.srt_filename;
      }

      // Add text/SRT/JSON files
      const srtFile: OutputFile = {
        type: 'srt',
        filename: srtFileName,
        label: `${formData.targetLanguage.toUpperCase()} Subtitle (.srt)`,
        format: 'SRT Subtitles',
        downloadUrl: api.getDownloadUrl(srtFileName),
      };
      generatedFiles.push(srtFile);

      // Create JSON data file
      const jsonFileName = `${currentJob.jobId}_translation.json`;
      const jsonFile: OutputFile = {
        type: 'json',
        filename: jsonFileName,
        label: 'Full Translation Data (.json)',
        format: 'JSON Structure',
        downloadUrl: api.getDownloadUrl(srtFileName),
      };
      generatedFiles.push(jsonFile);

      // Create Plain text script file
      const txtFileName = `${currentJob.jobId}_transcript.txt`;
      const txtFile: OutputFile = {
        type: 'txt',
        filename: txtFileName,
        label: 'Translated Script (.txt)',
        format: 'Plain Text',
        downloadUrl: api.getDownloadUrl(srtFileName),
      };
      generatedFiles.push(txtFile);

      setStages((prev) =>
        prev.map((st) => (st.id === 'translate' ? { ...st, status: 'done' } : st))
      );
      setOverallProgress(45);

      // ==========================================
      // STAGE 2: Burn Subtitles (if requested)
      // ==========================================
      if (!isTextOnly && formats.includes('subtitles')) {
        setStages((prev) =>
          prev.map((st) => (st.id === 'subtitles' ? { ...st, status: 'running' } : st))
        );
        setCurrentStageText('Hard-burning subtitles into video frames with FFmpeg...');
        setOverallProgress(60);

        try {
          const burnRes = await api.burnSubtitles(currentJob.jobId, srtFileName);
          const subtitledVideoName = burnRes.data.subtitled_video_filename;

          const subtitledVideoFile: OutputFile = {
            type: 'subtitled_video',
            filename: subtitledVideoName,
            label: 'Video with Burned-in Subtitles',
            format: 'MP4 Video',
            downloadUrl: api.getDownloadUrl(subtitledVideoName),
            mediaUrl: api.getMediaUrl(subtitledVideoName),
          };
          generatedFiles.push(subtitledVideoFile);

          setStages((prev) =>
            prev.map((st) => (st.id === 'subtitles' ? { ...st, status: 'done' } : st))
          );
        } catch (burnErr: any) {
          console.warn('Subtitle burn warning:', burnErr);
          toast.warning('Subtitles video encoding failed, but translated text is available.');
          setStages((prev) =>
            prev.map((st) => (st.id === 'subtitles' ? { ...st, status: 'error' } : st))
          );
        }
      }

      setOverallProgress(75);

      // ==========================================
      // STAGE 3: Dub Video (if requested)
      // ==========================================
      if (!isTextOnly && formats.includes('dubbing')) {
        setStages((prev) =>
          prev.map((st) => (st.id === 'dubbing' ? { ...st, status: 'running' } : st))
        );
        setCurrentStageText('Synthesizing neural voiceover track and muxing video...');
        setOverallProgress(85);

        try {
          const translatedTexts = translatedSegs.map((s) => s.translated_text || s.text);
          const dubRes = await api.dubVideo(
            currentJob.jobId,
            currentJob.segments,
            translatedTexts,
            formData.targetLanguage
          );

          const dubbedVideoName = dubRes.data.dubbed_video_filename;
          const dubbedVideoFile: OutputFile = {
            type: 'dubbed_video',
            filename: dubbedVideoName,
            label: 'AI Dubbed Full Video',
            format: 'MP4 Video with Voiceover',
            downloadUrl: api.getDownloadUrl(dubbedVideoName),
            mediaUrl: api.getMediaUrl(dubbedVideoName),
          };
          generatedFiles.push(dubbedVideoFile);

          setStages((prev) =>
            prev.map((st) => (st.id === 'dubbing' ? { ...st, status: 'done' } : st))
          );
        } catch (dubErr: any) {
          console.warn('Dubbing warning:', dubErr);
          toast.warning('Voice dubbing synthesis failed, but translated subtitles were generated.');
          setStages((prev) =>
            prev.map((st) => (st.id === 'dubbing' ? { ...st, status: 'error' } : st))
          );
        }
      }

      // ==========================================
      // COMPLETE ALL STAGES
      // ==========================================
      setOverallProgress(100);
      setCurrentStageText('All processing completed successfully!');
      setIsDone(true);

      const completedJob = {
        ...currentJob,
        status: 'complete' as const,
        progress: 100,
        outputFiles: generatedFiles,
        translatedSegments: translatedSegs,
        completedAt: new Date().toISOString(),
        durationSeconds: elapsedSeconds,
      };

      updateCurrentJob(completedJob);
      addToHistory(completedJob);

      // Auto-select preview file (prefer dubbed video, then subtitled video)
      const previewCandidate =
        generatedFiles.find((f) => f.type === 'dubbed_video') ||
        generatedFiles.find((f) => f.type === 'subtitled_video') ||
        null;
      setSelectedPreviewFile(previewCandidate);

      toast.success('Translation and video rendering complete!');
    } catch (err: any) {
      console.error('Pipeline processing error:', err);
      const msg = err?.response?.data?.detail || err.message || 'An error occurred during processing.';
      setErrorMsg(msg);
      setCurrentStageText(`Failed: ${msg}`);
      toast.error(`Processing error: ${msg}`);
      updateCurrentJob({
        status: 'error',
        error: msg,
      });
    }
  };

  // Run pipeline once on entry
  useEffect(() => {
    if (!hasExecutedRef.current) {
      runPipeline();
    }
  }, []);

  const handleDownloadFile = async (file: OutputFile) => {
    try {
      toast.info(`Downloading ${file.label}...`);
      await api.downloadBlob(file.filename);
      toast.success(`Downloaded ${file.label}!`);
    } catch (err) {
      // Fallback direct link
      window.open(file.downloadUrl, '_blank');
    }
  };

  const handleCopyTranslatedText = () => {
    if (!currentJob?.translatedSegments) return;
    const fullText = currentJob.translatedSegments.map((s) => s.translated_text).join('\n\n');
    navigator.clipboard.writeText(fullText);
    toast.success('Copied full translated text to clipboard!');
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s.toString().padStart(2, '0')}s`;
  };

  if (!currentJob) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-gray-500">No active job found.</p>
        <button
          onClick={() => setCurrentStep(1)}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium"
        >
          Start New Translation
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          {isDone ? 'Translation & Outputs Ready!' : 'Generating Deliverables'}
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {isDone
            ? 'Your translated assets, subtitles, and dubbed videos are ready for preview and download.'
            : 'Running offline AI pipeline. Subtitles and audio tracks are being generated and aligned.'}
        </p>
      </div>

      {/* Progress & Live Status Card */}
      <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50/40 dark:from-gray-800/90 dark:to-blue-950/30 rounded-3xl border border-blue-100 dark:border-blue-900/50 shadow-sm max-w-4xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {!isDone && !errorMsg ? (
              <div className="p-2.5 bg-blue-600 text-white rounded-2xl animate-spin shadow-md">
                <Loader2 className="w-5 h-5" />
              </div>
            ) : isDone ? (
              <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2.5 bg-red-600 text-white rounded-2xl shadow-md">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}

            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                {currentStageText}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  Elapsed Time: {formatElapsed(elapsedSeconds)}
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                  {overallProgress}% Complete
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageBadge language={formData.sourceLanguage} size="sm" />
            <span className="text-gray-400 font-bold">→</span>
            <LanguageBadge language={formData.targetLanguage} size="sm" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden relative">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              errorMsg
                ? 'bg-red-600'
                : isDone
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 animate-pulse'
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Stage Pills */}
        <div className="grid sm:grid-cols-3 gap-3 pt-2">
          {stages.map((stage) => {
            const isStageRunning = stage.status === 'running';
            const isStageDone = stage.status === 'done';
            const isStageError = stage.status === 'error';

            return (
              <div
                key={stage.id}
                className={`p-3 rounded-2xl border transition-all text-xs space-y-1 ${
                  isStageDone
                    ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : isStageRunning
                    ? 'border-blue-500 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 shadow-xs ring-2 ring-blue-500/20'
                    : isStageError
                    ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 dark:text-white truncate">
                    {stage.name}
                  </span>
                  {isStageDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                  {isStageRunning && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin flex-shrink-0" />}
                  {isStageError && <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                  {stage.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Retry Box */}
      {errorMsg && (
        <div className="p-6 bg-red-50 dark:bg-red-950/40 rounded-3xl border border-red-200 dark:border-red-800 text-center max-w-xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2 text-red-700 dark:text-red-300 font-bold">
            <AlertCircle className="w-5 h-5" />
            <span>Processing Interrupted</span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
          <button
            type="button"
            onClick={runPipeline}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
          >
            Retry Pipeline
          </button>
        </div>
      )}

      {/* Completed Deliverables Screen */}
      {isDone && (
        <div className="space-y-8 animate-fadeIn">
          {/* Media Player Stream (if video/audio generated) */}
          {selectedPreviewFile && selectedPreviewFile.mediaUrl && (
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Output Preview: {selectedPreviewFile.label}</span>
                </h3>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Ready to Stream & Download
                </span>
              </div>

              <VideoPlayer
                src={selectedPreviewFile.mediaUrl}
                title={selectedPreviewFile.label}
              />
            </div>
          )}

          {/* Download Deliverables Cards */}
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Download Generated Assets ({currentJob.outputFiles.length})
              </h3>
              <span className="text-xs text-gray-500">
                Click any asset card below to download directly to your computer
              </span>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {currentJob.outputFiles.map((file, idx) => {
                const isVideo = file.type === 'subtitled_video' || file.type === 'dubbed_video';
                const isDub = file.type === 'dubbed_video';
                const isSrt = file.type === 'srt';

                return (
                  <div
                    key={idx}
                    className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`p-3 rounded-2xl ${
                            isDub
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                              : isVideo
                              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {isDub ? (
                            <Mic2 className="w-5 h-5" />
                          ) : isVideo ? (
                            <Subtitles className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>

                        <span className="text-[10px] font-mono font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md">
                          {file.format}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-snug">
                          {file.label}
                        </h4>
                        <p className="text-[11px] text-gray-400 font-mono truncate mt-1">
                          {file.filename}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(file)}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>

                      {isVideo && file.mediaUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedPreviewFile(file)}
                          className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold"
                          title="Preview in video player"
                        >
                          Preview
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transcript Review Accordion */}
          {currentJob.translatedSegments && currentJob.translatedSegments.length > 0 && (
            <div className="max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setShowSegmentDetails(!showSegmentDetails)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-100/60 dark:hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                    View Translated Segments ({currentJob.translatedSegments.length})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyTranslatedText();
                    }}
                    className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-gray-50"
                  >
                    <Copy className="w-3 h-3" /> Copy All Text
                  </button>
                  {showSegmentDetails ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              {showSegmentDetails && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700/60 max-h-96 overflow-y-auto p-2 bg-white dark:bg-gray-800">
                  {currentJob.translatedSegments.map((seg, idx) => (
                    <div key={idx} className="p-3.5 grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-gray-400">
                          [{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s] Original ({currentJob.sourceLanguage})
                        </span>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                          {seg.original_text || seg.text}
                        </p>
                      </div>
                      <div className="space-y-1 sm:border-l sm:border-gray-100 dark:sm:border-gray-700 sm:pl-3">
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                          Translated ({currentJob.targetLanguage})
                        </span>
                        <p className="text-purple-900 dark:text-purple-200 font-semibold">
                          {seg.translated_text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-800 dark:text-gray-200 rounded-xl font-bold border border-gray-200 dark:border-gray-700 text-sm shadow-sm transition-all"
            >
              ← Back to Translation Review
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-800 dark:text-gray-200 rounded-xl font-bold border border-gray-200 dark:border-gray-700 text-sm shadow-sm transition-all"
            >
              Edit Transcript & Reprocess
            </button>

            <button
              type="button"
              onClick={() => reset()}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all transform active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Translation</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
