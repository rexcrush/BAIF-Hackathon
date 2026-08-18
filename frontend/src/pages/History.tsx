import React, { useState, useMemo } from 'react';
import { useTranslatorStore } from '../stores/translatorStore';
import { useNavigate } from 'react-router-dom';
import LanguageBadge from '../components/shared/LanguageBadge';
import StatusBadge from '../components/shared/StatusBadge';
import ConfirmModal from '../components/shared/ConfirmModal';
import { api } from '../services/api';
import {
  History as HistoryIcon,
  Search,
  Filter,
  Download,
  Trash2,
  ExternalLink,
  RotateCcw,
  Calendar,
  Layers,
  ArrowRight,
  FileText,
  Subtitles,
  Mic2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';
import type { Job, Language } from '../types';

export default function History() {
  const {
    jobHistory,
    removeFromHistory,
    clearHistory,
    setCurrentJob,
    setCurrentStep,
    setFormData,
  } = useTranslatorStore();

  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [targetLangFilter, setTargetLangFilter] = useState<string>('all');
  const [sourceLangFilter, setSourceLangFilter] = useState<string>('all');
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobHistory.filter((job) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        job.originalFilename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.segments?.some((s) => s.text.toLowerCase().includes(searchQuery.toLowerCase()));

      // Target language filter
      const matchesTarget =
        targetLangFilter === 'all' || job.targetLanguage === targetLangFilter;

      // Source language filter
      const matchesSource =
        sourceLangFilter === 'all' || job.sourceLanguage === sourceLangFilter;

      return matchesSearch && matchesTarget && matchesSource;
    });
  }, [jobHistory, searchQuery, targetLangFilter, sourceLangFilter]);

  // Re-open job in translator studio
  const handleReopenJob = (job: Job) => {
    setCurrentJob(job);
    setFormData({
      sourceLanguage: job.sourceLanguage,
      targetLanguage: job.targetLanguage,
      outputFormats: job.outputFormats || ['text'],
    });

    if (job.status === 'complete') {
      setCurrentStep(5);
    } else {
      setCurrentStep(2);
    }

    navigate('/translator');
    toast.info(`Opened job: ${job.originalFilename}`);
  };

  const handleDownload = async (filename: string) => {
    try {
      await api.downloadBlob(filename);
      toast.success(`Downloading ${filename}`);
    } catch (e: any) {
      toast.error(`Download failed: ${e.message}`);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Translation Job History
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Access your previous offline translations, generated subtitle files, and dubbed videos.
            </p>
          </div>
        </div>

        {jobHistory.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearAllModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/60 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Jobs</span>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {jobHistory.length}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Completed</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {jobHistory.filter((j) => j.status === 'complete').length}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Subtitled</span>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {jobHistory.filter((j) => j.outputFiles?.some((f) => f.type === 'subtitled_video')).length}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">AI Dubbed</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {jobHistory.filter((j) => j.outputFiles?.some((f) => f.type === 'dubbed_video')).length}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename, job ID, or transcript keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={targetLangFilter}
            onChange={(e) => setTargetLangFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Targets</option>
            <option value="hindi">Target: Hindi (🇮🇳)</option>
            <option value="marathi">Target: Marathi (🇮🇳)</option>
            <option value="english">Target: English (🇬🇧)</option>
          </select>

          <select
            value={sourceLangFilter}
            onChange={(e) => setSourceLangFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Sources</option>
            <option value="hindi">Source: Hindi</option>
            <option value="marathi">Source: Marathi</option>
            <option value="english">Source: English</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto text-gray-400">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No translation jobs found</h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {jobHistory.length === 0
              ? 'You haven’t translated any files yet. Upload a media file or paste text to get started.'
              : 'No jobs match your current search and filter criteria.'}
          </p>

          <button
            type="button"
            onClick={() => {
              setCurrentStep(1);
              navigate('/translator');
            }}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all"
          >
            Start New Translation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.jobId}
              className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              {/* Job Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-black text-gray-900 dark:text-white text-base sm:text-lg">
                      {job.originalFilename || 'Untitled Job'}
                    </h3>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" /> {formatDate(job.createdAt)}
                    </span>
                    <span>•</span>
                    <span>{job.segments?.length || 0} segments</span>
                    {job.durationSeconds && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {job.durationSeconds}s
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Language Flow */}
                <div className="flex items-center gap-2">
                  <LanguageBadge language={job.sourceLanguage} size="sm" />
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <LanguageBadge language={job.targetLanguage} size="sm" />
                </div>
              </div>

              {/* Downloads & Deliverables */}
              {job.outputFiles && job.outputFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Generated Deliverables
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {job.outputFiles.map((file, fIdx) => (
                      <button
                        key={fIdx}
                        type="button"
                        onClick={() => handleDownload(file.filename)}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 dark:bg-gray-700/50 dark:hover:bg-blue-950/40 text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-300 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{file.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(job.jobId)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors text-xs flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReopenJob(job)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span>Re-open in Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear All Modal */}
      <ConfirmModal
        isOpen={showClearAllModal}
        title="Clear All Translation History?"
        message="This will remove all job records from your browser's local cache. Output files on the backend will not be deleted."
        confirmLabel="Clear All"
        isDestructive={true}
        onConfirm={() => {
          clearHistory();
          setShowClearAllModal(false);
          toast.success('History cleared.');
        }}
        onCancel={() => setShowClearAllModal(false)}
      />

      {/* Delete Single Job Modal */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Delete Job Record?"
        message="Are you sure you want to remove this translation job from your history?"
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTargetId) {
            removeFromHistory(deleteTargetId);
            setDeleteTargetId(null);
            toast.info('Job removed from history.');
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
