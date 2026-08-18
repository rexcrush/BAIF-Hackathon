import React from 'react';
import type { Language } from '../../types';

interface LanguageBadgeProps {
  language: Language | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const LANGUAGE_CONFIG: Record<
  string,
  { name: string; nativeName: string; flag: string; color: string; bgColor: string }
> = {
  english: {
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
  },
  hindi: {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800',
  },
  marathi: {
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800',
  },
};

export default function LanguageBadge({
  language,
  size = 'md',
  showLabel = true,
  className = '',
}: LanguageBadgeProps) {
  const normalized = (language || 'english').toLowerCase();
  const config = LANGUAGE_CONFIG[normalized] || {
    name: language,
    nativeName: language,
    flag: '🌐',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-sm gap-2',
    lg: 'px-3.5 py-1.5 text-base gap-2.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm font-medium ${config.bgColor} ${config.color} ${sizeClasses[size]} ${className}`}
    >
      <span className="text-base leading-none">{config.flag}</span>
      {showLabel && (
        <span className="capitalize">
          {config.name} <span className="opacity-75 font-normal">({config.nativeName})</span>
        </span>
      )}
    </span>
  );
}
