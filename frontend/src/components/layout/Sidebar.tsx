import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslatorStore } from '../../stores/translatorStore';
import LanguageBadge from '../shared/LanguageBadge';
import {
  LayoutDashboard,
  Sparkles,
  History,
  Settings,
  HelpCircle,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const { jobHistory, setCurrentJob, setCurrentStep } = useTranslatorStore();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/translator', label: 'Translator Studio', icon: Sparkles },
    { to: '/history', label: 'Translation History', icon: History },
    { to: '/settings', label: 'Settings & Models', icon: Settings },
  ];

  const recentJobs = jobHistory.slice(0, 4);

  return (
    <aside className="hidden lg:block w-72 bg-white dark:bg-gray-900 border-r border-gray-200/80 dark:border-gray-800 p-6 space-y-8 flex-shrink-0">
      {/* Navigation */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3">
          Navigation
        </h3>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Recent History Widget */}
      {recentJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Recent Jobs
            </h3>
            <Link
              to="/history"
              className="text-[11px] font-bold text-blue-600 hover:underline"
            >
              All
            </Link>
          </div>

          <div className="space-y-2">
            {recentJobs.map((job) => (
              <Link
                key={job.jobId}
                to="/translator"
                onClick={() => {
                  setCurrentJob(job);
                  setCurrentStep(job.status === 'complete' ? 5 : 2);
                }}
                className="block p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border border-gray-200/60 dark:border-gray-700/60 transition-colors group"
              >
                <div className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600">
                  {job.originalFilename || 'Pasted Text'}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <LanguageBadge language={job.sourceLanguage} size="sm" showLabel={false} />
                  <span className="text-[10px] text-gray-400">→</span>
                  <LanguageBadge language={job.targetLanguage} size="sm" showLabel={false} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Offline Privacy Badge */}
      <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-3xl border border-emerald-200/80 dark:border-emerald-800/40 space-y-2">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Offline Privacy Mode</span>
        </div>
        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
          Whisper & IndicTrans2 models run entirely locally. No media leaves this machine.
        </p>
      </div>
    </aside>
  );
}
