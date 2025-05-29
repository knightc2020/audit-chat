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
    continuous = true,
    language = 'zh-CN'
  } = options;

  const [isListening, setIsListening] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  
  // 使用useRef保存回调函数，避免依赖数组问题
  const callbacksRef = React.useRef(options);
  
  // 更新回调函数引用
  React.useEffect(() => {
    callbacksRef.current = options;
  }, [options.onResult, options.onError, options.onStart, options.onEnd]);

  // 检查浏览器支持并初始化（只在mount时执行一次）
  React.useEffect(() => {
    console.log('🔧 初始化语音识别Hook');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition && !recognitionRef.current) {
      console.log('🎯 创建语音识别实例');
      
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎬 Hook: 语音识别开始');
        setIsListening(true);
        callbacksRef.current.onStart?.();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('🎯 Hook收到语音识别结果，results长度:', event.results.length);
        
        let finalTranscript = '';
        let interimTranscript = '';
        let hasAnyFinal = false;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          console.log(`结果 ${i}: "${result[0].transcript}", isFinal: ${result.isFinal}, confidence: ${result[0].confidence}`);
          
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            hasAnyFinal = true;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // 优先使用最终结果，如果没有则使用中间结果
        const currentTranscript = finalTranscript || interimTranscript;
        const isFinal = hasAnyFinal || !!finalTranscript;
        
        console.log('🎤 Hook准备发送结果:', { 
          transcript: currentTranscript, 
          isFinal,
          finalTranscript,
          interimTranscript 
        });

        setTranscript(currentTranscript);

        // 只有当有实际内容时才调用onResult
        if (currentTranscript.trim()) {
          callbacksRef.current.onResult?.({
            transcript: currentTranscript,
            confidence: event.results[event.results.length - 1]?.[0]?.confidence || 0,
            isFinal: isFinal
          });
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('❌ Hook: 语音识别错误:', event.error);
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
        
        callbacksRef.current.onError?.(errorMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('🏁 Hook: 语音识别结束');
        setIsListening(false);
        callbacksRef.current.onEnd?.();
      };

      recognitionRef.current = recognition;
      console.log('✅ 语音识别实例创建完成');
    }

    return () => {
      console.log('🧹 清理语音识别实例');
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [continuous, language]); // 只依赖静态配置

  const startListening = React.useCallback(() => {
    console.log('▶️ Hook: 尝试开始监听');
    
    if (!isSupported) {
      console.error('❌ Hook: 浏览器不支持');
      callbacksRef.current.onError?.('浏览器不支持语音识别功能');
      return;
    }

    if (recognitionRef.current && !isListening) {
      console.log('🎙️ Hook: 启动语音识别');
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('❌ Hook: 启动失败:', error);
        callbacksRef.current.onError?.('启动语音识别失败');
      }
    } else {
      console.warn('⚠️ Hook: 无法启动 - recognition存在:', !!recognitionRef.current, ', 正在监听:', isListening);
    }
  }, [isSupported, isListening]);

  const stopListening = React.useCallback(() => {
    console.log('🛑 Hook: 停止监听');
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const abortListening = React.useCallback(() => {
    console.log('💥 Hook: 中止监听');
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
  }, []);

  const resetTranscript = React.useCallback(() => {
    console.log('🔄 Hook: 重置转录');
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