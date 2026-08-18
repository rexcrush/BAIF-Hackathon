import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Heart, Shield, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-gray-100 dark:border-gray-800 text-center md:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-gray-900 dark:text-white text-base">
                Sanskriti Sync
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Offline video transcription, neural translation, and AI voice dubbing for cultural & regional impact.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">
              Dashboard
            </Link>
            <Link to="/translator" className="hover:text-blue-600 dark:hover:text-blue-400">
              Studio
            </Link>
            <Link to="/history" className="hover:text-blue-600 dark:hover:text-blue-400">
              Job History
            </Link>
            <Link to="/settings" className="hover:text-blue-600 dark:hover:text-blue-400">
              Settings
            </Link>
            <Link to="/about" className="hover:text-blue-600 dark:hover:text-blue-400">
              About & Models
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
            <span>for rural impact & community communications</span>
          </div>

          <div>
            <span>© 2026 Sanskriti Sync • 100% Offline & Private</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
