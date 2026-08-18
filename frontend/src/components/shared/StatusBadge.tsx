import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2, PlayCircle } from 'lucide-react';
import type { JobStatus } from '../../types';

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
  showText?: boolean;
}

export default function StatusBadge({
  status,
  className = '',
  showText = true,
}: StatusBadgeProps) {
  const configs: Record<
    JobStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    complete: {
      label: 'Complete',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    processing: {
      label: 'Processing',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    },
    translating: {
      label: 'Translating',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    },
    transcribing: {
      label: 'Transcribing',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    },
    uploading: {
      label: 'Uploading',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      icon: <Clock className="w-3.5 h-3.5 animate-pulse" />,
    },
    error: {
      label: 'Failed',
      bg: 'bg-red-50 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    idle: {
      label: 'Ready',
      bg: 'bg-gray-50 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-700',
      icon: <PlayCircle className="w-3.5 h-3.5" />,
    },
  };

  const config = configs[status] || configs.idle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {config.icon}
      {showText && <span>{config.label}</span>}
    </span>
  );
}
