import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslatorStore } from '../stores/translatorStore';
import { api } from '../services/api';
import LanguageBadge from '../components/shared/LanguageBadge';
import StatusBadge from '../components/shared/StatusBadge';
import {
  ArrowRight,
  Zap,
  Shield,
  Globe,
  FileUp,
  History,
  CheckCircle2,
  Sparkles,
  Layers,
  Subtitles,
  Mic2,
  FileText,
  Clock,
  Server,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const { jobHistory, setCurrentJob, setCurrentStep, setFormData, userSettings } =
    useTranslatorStore();
  const navigate = useNavigate();

  const [engineStatus, setEngineStatus] = useState<{
    connected: boolean;
    latencyMs?: number;
  }>({ connected: false });

  useEffect(() => {
    let isMounted = true;
    api
      .health()
      .then((res) => {
        if (isMounted) setEngineStatus({ connected: true, latencyMs: res.latencyMs });
      })
      .catch(() => {
        if (isMounted) setEngineStatus({ connected: false });
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFormData({ inputFile: acceptedFiles[0] });
      setCurrentStep(1);
      navigate('/translator');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.mkv'],
      'audio/*': ['.wav', '.mp3', '.m4a'],
    },
    multiple: false,
  });

  const recentJobs = jobHistory.slice(0, 3);

  return (
    <div className="space-y-12 animate-fadeIn pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-purple-950 text-white p-8 sm:p-14 shadow-2xl border border-blue-800/40">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/20 backdrop-blur-md rounded-full border border-blue-400/30 text-xs font-semibold text-blue-200">
            <Sparkles className="w-4 h-4 text-blue-300" />
            <span>Sanskriti Sync • Offline-First Multilingual AI Studio</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Break Language Barriers with Sanskriti Sync
          </h1>

          <p className="text-sm sm:text-lg text-blue-100/80 leading-relaxed max-w-2xl">
            Translate speech audio, video files, and transcripts effortlessly between{' '}
            <strong className="text-white font-bold">English, Hindi (हिन्दी), and Marathi (मराठी)</strong> with automatic subtitle burning and neural AI voice dubbing.
          </p>

          {/* CTAs and Engine Status */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/translator"
              className="inline-flex items-center gap-2.5 bg-blue-500 hover:bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-xs text-blue-200 font-semibold">
              <Server className="w-4 h-4 text-blue-300" />
              <span>Engine:</span>
              {engineStatus.connected ? (
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  Online ({engineStatus.latencyMs}ms)
                </span>
              ) : (
                <span className="text-amber-300 font-bold">Ready on Localhost:8000</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Dropzone directly on Dashboard */}
      <div
        {...getRootProps()}
        className={`p-8 sm:p-10 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all duration-300 bg-white dark:bg-gray-800 shadow-sm ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 scale-[1.01]'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
            <FileUp className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Quick Start: Drop your video or audio file here
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md">
            MP4, WebM, MKV, WAV, MP3, M4A • Automatic speech recognition and timestamp extraction
          </p>
        </div>
      </div>

      {/* Recent Jobs Section (if any exist) */}
      {recentJobs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <span>Recent Translation Jobs</span>
            </h2>
            <Link
              to="/history"
              className="text-xs sm:text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View All History</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {recentJobs.map((job) => (
              <div
                key={job.jobId}
                onClick={() => {
                  setCurrentJob(job);
                  setCurrentStep(job.status === 'complete' ? 5 : 2);
                  navigate('/translator');
                }}
                className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <StatusBadge status={job.status} />
                  <span className="text-[10px] text-gray-400 font-mono">
                    {job.segments?.length || 0} segments
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate group-hover:text-blue-600 transition-colors">
                  {job.originalFilename || 'Pasted Text'}
                </h3>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <LanguageBadge language={job.sourceLanguage} size="sm" />
                  <span className="text-gray-400 text-xs">→</span>
                  <LanguageBadge language={job.targetLanguage} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            High-Performance Neural Models
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Powered by Faster-Whisper for timestamped ASR, IndicTrans2 for nuanced Indian language translations, and Meta MMS for speech synthesis.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            100% Offline & Private
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            All AI computation executes locally on your hardware. Zero data leaves your computer, making it compliant for sensitive NGO and healthcare media.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
            <Subtitles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Subtitles & Video Dubbing
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Export standard .SRT subtitle files, render burned-in video subtitles with custom styling, or replace original audio with translated AI voiceover tracks.
          </p>
        </div>
      </div>

      {/* Workflow Steps Card */}
      <div className="bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-8">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          How the 5-Step Workflow Works
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            {
              step: '1',
              title: 'Upload Content',
              desc: 'Upload audio/video or paste text directly',
              icon: FileUp,
            },
            {
              step: '2',
              title: 'Review Transcript',
              desc: 'Inspect, edit, and listen to speech segments',
              icon: Layers,
            },
            {
              step: '3',
              title: 'Select Languages',
              desc: 'Pick target language with live preview',
              icon: Globe,
            },
            {
              step: '4',
              title: 'Output Format',
              desc: 'Choose subtitles, SRT, or dubbed video',
              icon: Subtitles,
            },
            {
              step: '5',
              title: 'Process & Download',
              desc: 'Preview result video & download assets',
              icon: CheckCircle2,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                    {item.step}
                  </span>
                  <Icon className="w-5 h-5 text-gray-400" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base">
                  {item.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
