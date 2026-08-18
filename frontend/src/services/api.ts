import axios, { AxiosProgressEvent } from 'axios';
import type {
  UploadResponse,
  TranslateSegmentsResponse,
  BurnSubtitlesResponse,
  DubVideoResponse,
  TranslateTextResponse,
  Segment,
  Language,
} from '../types';

export const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const getApiBaseUrl = (): string => {
  try {
    const storedSettings = localStorage.getItem('ngo-translator-storage');
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      if (parsed?.state?.userSettings?.apiUrl) {
        return parsed.state.userSettings.apiUrl;
      }
    }
  } catch {
    // Fallback to default
  }
  return DEFAULT_API_URL;
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 600000, // 10 minutes for intensive AI speech & video processing
});

// Update baseURL dynamically before every request
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

export const api = {
  // Health check with latency measurement
  health: async (): Promise<{ status: string; supported_languages: string[]; latencyMs: number }> => {
    const start = performance.now();
    const response = await apiClient.get<{ status: string; supported_languages: string[] }>('/');
    const latencyMs = Math.round(performance.now() - start);
    return {
      ...response.data,
      latencyMs,
    };
  },

  // Upload and transcribe file with upload progress callback
  upload: (
    file: File,
    sourceLanguage?: string,
    onProgress?: (percent: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sourceLanguage && sourceLanguage !== 'auto') {
      formData.append('source_language', sourceLanguage);
    }
    return apiClient.post<UploadResponse>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },

  // Direct single text translation
  translateText: (text: string, sourceLanguage: Language, targetLanguage: Language) => {
    return apiClient.post<TranslateTextResponse>('/translate', {
      text,
      source_lang: sourceLanguage,
      target_lang: targetLanguage,
    });
  },

  // Translate all segments
  translateSegments: (
    jobId: string,
    segments: Segment[],
    sourceLanguage: Language,
    targetLanguage: Language
  ) => {
    return apiClient.post<TranslateSegmentsResponse>('/translate-segments', {
      job_id: jobId,
      segments,
      source_lang: sourceLanguage,
      target_lang: targetLanguage,
    });
  },

  // Save updated translated SRT
  saveSrt: (jobId: string, targetLang: Language, segments: Segment[]) => {
    return apiClient.post<{ job_id: string; srt_filename: string; message: string }>('/save-srt', {
      job_id: jobId,
      target_lang: targetLang,
      segments,
    });
  },

  // Burn subtitles into video
  burnSubtitles: (jobId: string, srtFilename: string) => {
    return apiClient.post<BurnSubtitlesResponse>('/burn-subtitles', {
      job_id: jobId,
      srt_filename: srtFilename,
    });
  },

  // Generate dubbed audio and mux into video
  dubVideo: (
    jobId: string,
    segments: Segment[],
    translatedTexts: string[],
    targetLang: Language
  ) => {
    return apiClient.post<DubVideoResponse>('/dub-video', {
      job_id: jobId,
      segments,
      translated_texts: translatedTexts,
      target_lang: targetLang,
    });
  },

  // Neural TTS short preview
  ttsPreview: (text: string, language: Language | string) => {
    return apiClient.post<{ audio_filename: string; audio_url: string }>('/tts-preview', {
      text,
      language,
    });
  },

  // URL helpers
  getDownloadUrl: (filename: string): string => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl.replace(/\/$/, '')}/download/${encodeURIComponent(filename)}`;
  },

  getMediaUrl: (filename: string): string => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl.replace(/\/$/, '')}/media/${encodeURIComponent(filename)}`;
  },

  // Download blob helper
  downloadBlob: async (filename: string, customSaveName?: string) => {
    const response = await apiClient.get(`/download/${encodeURIComponent(filename)}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = customSaveName || filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default api;
