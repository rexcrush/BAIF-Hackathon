import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  TranslatorState,
  FormData,
  Job,
  Segment,
  UserSettings,
} from '../types';

const initialFormData: FormData = {
  sourceLanguage: 'hindi',
  targetLanguage: 'marathi',
  outputFormats: ['text', 'subtitles'],
  subtitleSettings: {
    fontSize: 18,
    position: 'bottom',
    fontColor: '#ffffff',
    bgColor: 'rgba(0,0,0,0.6)',
  },
  dubSettings: {
    voiceQuality: 'standard',
    speedAdjustment: 'automatic',
  },
};

const initialUserSettings: UserSettings = {
  defaultSourceLanguage: 'hindi',
  defaultTargetLanguage: 'marathi',
  autoPlaySegmentAudio: true,
  theme: 'light',
  apiUrl: 'http://localhost:8000',
};

export const useTranslatorStore = create<TranslatorState>()(
  persist(
    (set) => ({
      currentJob: null,
      currentStep: 1,
      formData: initialFormData,
      jobHistory: [],
      userSettings: initialUserSettings,
      isProcessing: false,
      activeSegmentIndex: null,
      isPlayingAudio: false,

      // Navigation
      setCurrentStep: (step) => set({ currentStep: step }),

      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      setCurrentJob: (job) => set({ currentJob: job }),

      updateCurrentJob: (updater) =>
        set((state) => {
          if (!state.currentJob) return state;
          const updated =
            typeof updater === 'function' ? updater(state.currentJob) : { ...state.currentJob, ...updater };
          return { currentJob: updated };
        }),

      // Segment Operations
      updateSegment: (index: number, newText: string) =>
        set((state) => {
          if (!state.currentJob) return state;
          const segments = [...state.currentJob.segments];
          if (segments[index]) {
            segments[index] = { ...segments[index], text: newText };
          }
          return {
            currentJob: {
              ...state.currentJob,
              segments,
            },
          };
        }),

      deleteSegment: (index: number) =>
        set((state) => {
          if (!state.currentJob) return state;
          const segments = state.currentJob.segments.filter((_, i) => i !== index);
          return {
            currentJob: {
              ...state.currentJob,
              segments,
            },
          };
        }),

      addSegment: (segment: Segment, insertAtIndex?: number) =>
        set((state) => {
          if (!state.currentJob) return state;
          const segments = [...state.currentJob.segments];
          if (typeof insertAtIndex === 'number') {
            segments.splice(insertAtIndex, 0, segment);
          } else {
            segments.push(segment);
          }
          // Sort by start timestamp
          segments.sort((a, b) => a.start - b.start);
          return {
            currentJob: {
              ...state.currentJob,
              segments,
            },
          };
        }),

      searchAndReplace: (search: string, replace: string) =>
        set((state) => {
          if (!state.currentJob || !search) return state;
          const segments = state.currentJob.segments.map((seg) => ({
            ...seg,
            text: seg.text.replaceAll(search, replace),
          }));
          return {
            currentJob: {
              ...state.currentJob,
              segments,
            },
          };
        }),

      updateTranslatedSegment: (index: number, newTranslatedText: string) =>
        set((state) => {
          if (!state.currentJob || !state.currentJob.translatedSegments) return state;
          const translatedSegments = [...state.currentJob.translatedSegments];
          if (translatedSegments[index]) {
            translatedSegments[index] = {
              ...translatedSegments[index],
              translated_text: newTranslatedText,
              text: newTranslatedText,
            };
          }
          return {
            currentJob: {
              ...state.currentJob,
              translatedSegments,
            },
          };
        }),

      searchAndReplaceTranslated: (search: string, replace: string) =>
        set((state) => {
          if (!state.currentJob || !state.currentJob.translatedSegments || !search) return state;
          const translatedSegments = state.currentJob.translatedSegments.map((seg) => ({
            ...seg,
            translated_text: seg.translated_text.replaceAll(search, replace),
            text: seg.translated_text.replaceAll(search, replace),
          }));
          return {
            currentJob: {
              ...state.currentJob,
              translatedSegments,
            },
          };
        }),

      // History
      addToHistory: (job: Job) =>
        set((state) => {
          const filtered = state.jobHistory.filter((j) => j.jobId !== job.jobId);
          return {
            jobHistory: [job, ...filtered].slice(0, 100), // Persist last 100 jobs
          };
        }),

      removeFromHistory: (jobId: string) =>
        set((state) => ({
          jobHistory: state.jobHistory.filter((j) => j.jobId !== jobId),
        })),

      clearHistory: () => set({ jobHistory: [] }),

      // Settings
      updateUserSettings: (settings) =>
        set((state) => ({
          userSettings: { ...state.userSettings, ...settings },
        })),

      // Audio Playback
      setActiveSegmentIndex: (index) => set({ activeSegmentIndex: index }),
      setIsPlayingAudio: (isPlaying) => set({ isPlayingAudio: isPlaying }),

      // Reset Workflow
      reset: () =>
        set((state) => ({
          currentJob: null,
          currentStep: 1,
          isProcessing: false,
          activeSegmentIndex: null,
          isPlayingAudio: false,
          formData: {
            ...initialFormData,
            sourceLanguage: state.userSettings.defaultSourceLanguage,
            targetLanguage: state.userSettings.defaultTargetLanguage,
          },
        })),
    }),
    {
      name: 'ngo-translator-storage',
      partialize: (state) => ({
        jobHistory: state.jobHistory,
        userSettings: state.userSettings,
      }),
    }
  )
);
