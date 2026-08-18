export type Language = 'english' | 'hindi' | 'marathi';

export type OutputFormat = 'text' | 'subtitles' | 'dubbing';

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface TranslatedSegment extends Segment {
  original_text: string;
  translated_text: string;
}

export interface OutputFile {
  type: 'srt' | 'json' | 'txt' | 'subtitled_video' | 'dubbed_video';
  filename: string;
  label: string;
  format: string;
  downloadUrl: string;
  mediaUrl?: string;
  sizeBytes?: number;
}

export type JobStatus =
  | 'idle'
  | 'uploading'
  | 'transcribing'
  | 'translating'
  | 'processing'
  | 'complete'
  | 'error';

export interface Job {
  jobId: string;
  originalFilename: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  detectedLanguage?: string;
  languageConfidence?: number;
  segments: Segment[];
  translatedSegments: TranslatedSegment[];
  outputFormats: OutputFormat[];
  outputFiles: OutputFile[];
  status: JobStatus;
  progress: number;
  currentStageText?: string;
  error?: string;
  extractedAudioPath?: string;
  isTextOnly?: boolean;
  createdAt: string; // ISO date string for JSON serialization
  completedAt?: string;
  durationSeconds?: number;
}

export interface UploadResponse {
  job_id: string;
  original_filename: string;
  extracted_audio_path: string;
  detected_language: string;
  language_confidence: number;
  segments: Segment[];
}

export interface TranslateSegmentsResponse {
  job_id: string;
  target_lang: string;
  segments: TranslatedSegment[];
  srt_filename: string;
}

export interface BurnSubtitlesResponse {
  job_id: string;
  subtitled_video_filename: string;
}

export interface DubVideoResponse {
  job_id: string;
  dubbed_video_filename: string;
}

export interface TranslateTextResponse {
  translated_text: string;
}

export interface SubtitleSettings {
  fontSize: number;
  position: 'top' | 'bottom';
  fontColor?: string;
  bgColor?: string;
}

export interface DubSettings {
  voiceQuality: 'standard' | 'high';
  speedAdjustment: 'automatic' | 'manual';
}

export interface FormData {
  inputFile?: File;
  inputAudioUrl?: string;
  inputText?: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  outputFormats: OutputFormat[];
  subtitleSettings: SubtitleSettings;
  dubSettings: DubSettings;
}

export interface UserSettings {
  defaultSourceLanguage: Language;
  defaultTargetLanguage: Language;
  autoPlaySegmentAudio: boolean;
  theme: 'light' | 'dark' | 'system';
  apiUrl: string;
}

export interface TranslatorState {
  currentJob: Job | null;
  currentStep: 1 | 2 | 3 | 4 | 5;
  formData: FormData;
  jobHistory: Job[];
  userSettings: UserSettings;
  isProcessing: boolean;
  activeSegmentIndex: number | null;
  isPlayingAudio: boolean;

  // Navigation & Step Control
  setCurrentStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  setFormData: (data: Partial<FormData>) => void;
  setCurrentJob: (job: Job | null) => void;
  updateCurrentJob: (updater: Partial<Job> | ((prev: Job) => Job)) => void;

  // Segment Operations
  updateSegment: (index: number, newText: string) => void;
  deleteSegment: (index: number) => void;
  addSegment: (segment: Segment, insertAtIndex?: number) => void;
  searchAndReplace: (search: string, replace: string) => void;
  updateTranslatedSegment: (index: number, newTranslatedText: string) => void;
  searchAndReplaceTranslated: (search: string, replace: string) => void;

  // History & Settings Actions
  addToHistory: (job: Job) => void;
  removeFromHistory: (jobId: string) => void;
  clearHistory: () => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;

  // Audio Playback
  setActiveSegmentIndex: (index: number | null) => void;
  setIsPlayingAudio: (isPlaying: boolean) => void;

  // Workflow Reset
  reset: () => void;
}
