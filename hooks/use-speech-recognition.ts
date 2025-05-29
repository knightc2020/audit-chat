"use client";

import * as React from 'react';

interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface UseSpeechRecognitionOptions {
  onResult?: (result: SpeechResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  continuous?: boolean;
  language?: string;
}

// 扩展Window接口以包含语音识别API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// 定义SpeechRecognition接口
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    onResult,
    onError,
    onStart,
    onEnd,
    continuous = true,
    language = 'zh-CN'
  } = options;

  const [isListening, setIsListening] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);

  // 检查浏览器支持
  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        onStart?.();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);

        onResult?.({
          transcript: currentTranscript,
          confidence: event.results[event.results.length - 1]?.[0]?.confidence || 0,
          isFinal: event.results[event.results.length - 1]?.isFinal || false
        });
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('语音识别错误:', event.error);
        let errorMessage = '语音识别出错';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = '未检测到语音，请重试';
            break;
          case 'audio-capture':
            errorMessage = '无法访问麦克风，请检查权限';
            break;
          case 'not-allowed':
            errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问';
            break;
          case 'network':
            errorMessage = '网络错误，请检查网络连接';
            break;
          case 'service-not-allowed':
            errorMessage = '语音服务不可用';
            break;
        }
        
        onError?.(errorMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        onEnd?.();
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, language, onStart, onResult, onError, onEnd]);

  const startListening = React.useCallback(() => {
    if (!isSupported) {
      onError?.('浏览器不支持语音识别功能');
      return;
    }

    if (recognitionRef.current && !isListening) {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('启动语音识别失败:', error);
        onError?.('启动语音识别失败');
      }
    }
  }, [isSupported, isListening, onError]);

  const stopListening = React.useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const abortListening = React.useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
  }, []);

  const resetTranscript = React.useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    abortListening,
    resetTranscript
  };
} 