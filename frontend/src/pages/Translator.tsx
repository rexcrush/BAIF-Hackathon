import React, { useState } from 'react';
import { useTranslatorStore } from '../stores/translatorStore';
import Step1_Upload from './translator/Step1_Upload';
import Step2_Transcription from './translator/Step2_Transcription';
import Step3_Languages from './translator/Step3_Languages';
import Step4_Output from './translator/Step4_Output';
import ConfirmModal from '../components/shared/ConfirmModal';
import { RotateCcw, Sparkles } from 'lucide-react';

export default function Translator() {
  const { currentStep, setCurrentStep, currentJob, reset } = useTranslatorStore();
  const [showResetModal, setShowResetModal] = useState(false);

  const steps = [
    { number: 1, title: 'Upload & Input', desc: 'Select audio/video or text' },
    { number: 2, title: 'Transcript & Languages', desc: 'Edit speech & pick target' },
    { number: 3, title: 'Review & Outputs', desc: 'Verify translation & configure' },
    { number: 4, title: 'Generate & Download', desc: 'Render & download deliverables' },
  ];

  const handleStepClick = (stepNum: number) => {
    // Only allow navigating backwards or if data exists
    if (stepNum < currentStep) {
      setCurrentStep(stepNum as 1 | 2 | 3 | 4);
    } else if (stepNum === 2 && currentJob?.segments && currentJob.segments.length > 0) {
      setCurrentStep(2);
    } else if (stepNum === 3 && currentJob?.segments) {
      setCurrentStep(3);
    } else if (stepNum === 4 && currentJob?.segments) {
      setCurrentStep(4);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_Upload />;
      case 2:
        return <Step2_Transcription />;
      case 3:
        return <Step3_Languages />;
      case 4:
        return <Step4_Output />;
      default:
        return <Step1_Upload />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/10 via-indigo-900/5 to-purple-900/10 dark:from-blue-950/40 dark:to-purple-950/40 p-4 sm:p-6 rounded-3xl border border-blue-100 dark:border-blue-900/40 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Sanskriti Sync Studio
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Offline neural speech recognition, translation & video dubbing (English • हिन्दी • मराठी)
            </p>
          </div>
        </div>

        {currentJob && (
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl border border-gray-200 dark:border-gray-700 transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Translation</span>
          </button>
        )}
      </div>

      {/* Modern Interactive Stepper Header */}
      <div className="relative px-2 sm:px-6">
        <div className="hidden sm:block absolute top-5 left-10 right-10 h-0.5 bg-gray-200 dark:bg-gray-700 -z-0"></div>
        <div
          className="hidden sm:block absolute top-5 left-10 h-0.5 bg-blue-600 transition-all duration-500 -z-0"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>

        <div className="grid grid-cols-4 gap-2 sm:gap-4 relative z-10">
          {steps.map((step) => {
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            const isAccessible = step.number <= currentStep;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => handleStepClick(step.number)}
                disabled={!isAccessible}
                className={`flex flex-col items-center text-center transition-all group ${
                  isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-300 shadow-sm
                    ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40 shadow-blue-500/25 scale-110'
                        : isCompleted
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                        : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400'
                    }`}
                >
                  {isCompleted ? '✓' : step.number}
                </div>
                <div className="mt-2.5">
                  <span
                    className={`block text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-none ${
                      isCurrent
                        ? 'text-blue-600 dark:text-blue-400'
                        : isCompleted
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-gray-800/95 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700/80 p-6 sm:p-10 min-h-[520px] transition-all backdrop-blur-sm">
        {renderStep()}
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Start New Translation?"
        message="Starting a new translation will clear your current in-progress job. Any finished files can still be accessed from the History tab."
        confirmLabel="Start New"
        cancelLabel="Continue Current"
        isDestructive={true}
        onConfirm={() => {
          reset();
          setShowResetModal(false);
        }}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
}
