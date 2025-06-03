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

// 检测是否为移动设备
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    continuous = true,
    language = 'zh-CN'
  } = options;

  const [isListening, setIsListening] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [isMobile, setIsMobile] = React.useState(false);
  
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const isStartingRef = React.useRef(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // 使用useRef保存回调函数，避免依赖数组问题
  const callbacksRef = React.useRef(options);
  
  // 更新回调函数引用
  React.useEffect(() => {
    callbacksRef.current = options;
  }, [options.onResult, options.onError, options.onStart, options.onEnd]);

  // 检查设备类型和浏览器支持
  React.useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    
    console.log('🔧 初始化语音识别Hook - 移动设备:', mobile);
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition && !recognitionRef.current) {
      console.log('🎯 创建语音识别实例');
      
      const recognition = new SpeechRecognition();
      
      // 移动端优化配置
      if (mobile) {
        recognition.continuous = false; // 移动端使用非连续模式
        recognition.interimResults = false; // 移动端关闭中间结果，更稳定
      } else {
        recognition.continuous = continuous;
        recognition.interimResults = true;
      }
      
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎬 Hook: 语音识别开始');
        setIsListening(true);
        isStartingRef.current = false;
        
        // 移动端超时保护
        if (mobile) {
          timeoutRef.current = setTimeout(() => {
            console.log('⏰ 移动端超时，自动停止');
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }, 10000); // 移动端10秒超时
        }
        
        callbacksRef.current.onStart?.();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('🎯 Hook收到语音识别结果，results长度:', event.results.length);
        
        // 清除超时定时器
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
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

        // 移动端和桌面端区别处理
        let currentTranscript = '';
        let isFinal = false;
        
        if (mobile) {
          // 移动端：只处理最终结果
          currentTranscript = finalTranscript;
          isFinal = hasAnyFinal;
        } else {
          // 桌面端：处理所有结果
          currentTranscript = finalTranscript || interimTranscript;
          isFinal = hasAnyFinal || !!finalTranscript;
        }

        console.log('🎤 Hook准备发送结果:', { 
          transcript: currentTranscript, 
          isFinal,
          finalTranscript,
          interimTranscript,
          isMobile: mobile
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
        console.error('❌ Hook: 语音识别错误:', event.error, event);
        
        // 清除超时定时器
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        let errorMessage = '语音识别出错';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = mobile ? '未检测到语音，请大声说话并重试' : '未检测到语音，请重试';
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
          case 'aborted':
            // 主动停止时不报错
            console.log('语音识别被主动停止');
            setIsListening(false);
            isStartingRef.current = false;
            return;
        }
        
        callbacksRef.current.onError?.(errorMessage);
        setIsListening(false);
        isStartingRef.current = false;
      };

      recognition.onend = () => {
        console.log('🏁 Hook: 语音识别结束');
        
        // 清除超时定时器
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        setIsListening(false);
        isStartingRef.current = false;
        callbacksRef.current.onEnd?.();
      };

      recognitionRef.current = recognition;
      console.log('✅ 语音识别实例创建完成 - 移动端模式:', mobile);
    }

    return () => {
      console.log('🧹 清理语音识别实例');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [continuous, language]);

  const startListening = React.useCallback(() => {
    console.log('▶️ Hook: 尝试开始监听 - 移动设备:', isMobile);
    
    if (!isSupported) {
      console.error('❌ Hook: 浏览器不支持');
      callbacksRef.current.onError?.('浏览器不支持语音识别功能');
      return;
    }

    if (isStartingRef.current) {
      console.warn('⚠️ 正在启动中，请稍等');
      return;
    }

    if (recognitionRef.current && !isListening) {
      console.log('🎙️ Hook: 启动语音识别');
      setTranscript('');
      isStartingRef.current = true;
      
      try {
        // 移动端需要特殊处理 - 先请求权限再启动
        if (isMobile) {
          navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 16000
            } 
          })
          .then((stream) => {
            console.log('✅ 移动端媒体流获取成功');
            // 立即关闭流，避免占用
            stream.getTracks().forEach(track => track.stop());
            
            // 延迟启动，给浏览器时间准备
            setTimeout(() => {
              if (recognitionRef.current && isStartingRef.current) {
                recognitionRef.current.start();
              }
            }, 200);
          })
          .catch((error) => {
            console.error('❌ 移动端媒体流获取失败:', error);
            isStartingRef.current = false;
            callbacksRef.current.onError?.('无法获取麦克风权限，请在设置中允许');
          });
        } else {
          // 桌面端直接启动
          recognitionRef.current.start();
        }
      } catch (error) {
        console.error('❌ Hook: 启动失败:', error);
        isStartingRef.current = false;
        callbacksRef.current.onError?.('启动语音识别失败: ' + error);
      }
    } else {
      console.warn('⚠️ Hook: 无法启动 - recognition存在:', !!recognitionRef.current, ', 正在监听:', isListening);
    }
  }, [isSupported, isListening, isMobile]);

  const stopListening = React.useCallback(() => {
    console.log('🛑 Hook: 停止监听');
    
    // 清除超时定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (recognitionRef.current && (isListening || isStartingRef.current)) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const abortListening = React.useCallback(() => {
    console.log('💥 Hook: 中止监听');
    
    // 清除超时定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
      isStartingRef.current = false;
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
    resetTranscript,
    isMobile
  };
} 