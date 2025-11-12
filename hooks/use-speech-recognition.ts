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
        let solution = '';

        switch (event.error) {
          case 'no-speech':
            errorMessage = '未检测到语音信号';
            solution = '请确保：1) 说话声音足够大 2) 在安静环境中使用 3) 距离麦克风适中（10-30cm）';
            if (mobile) {
              solution += ' 4) 移动端需等待说完后停止';
            }
            break;
          case 'audio-capture':
            errorMessage = '无法访问麦克风设备';
            solution = '请检查：1) 麦克风是否正常连接 2) 浏览器是否有麦克风权限 3) 尝试重新插拔麦克风';
            break;
          case 'not-allowed':
            errorMessage = '麦克风权限被拒绝';
            solution = '请在浏览器地址栏左侧（🔒 或 🎤 图标）点击，允许麦克风访问，然后刷新页面重试';
            break;
          case 'network':
            errorMessage = '网络连接错误';
            solution = '请检查网络连接：1) 确保网络稳定 2) 尝试刷新页面 3) 关闭VPN（如果正在使用）';
            break;
          case 'service-not-allowed':
            errorMessage = '语音识别服务不可用';
            solution = '可能原因：1) 浏览器不支持该服务 2) 服务暂时不可用 3) 建议尝试其他浏览器';
            break;
          case 'aborted':
            // 主动停止时不报错
            console.log('语音识别被主动停止');
            setIsListening(false);
            isStartingRef.current = false;
            return;
          case 'language-not-supported':
            errorMessage = '不支持当前语言';
            solution = '请尝试：1) 切换到中文（普通话） 2) 检查系统语言设置 3) 使用其他浏览器';
            break;
          case 'bad-grammar':
            errorMessage = '语音识别配置错误';
            solution = '请刷新页面重试，或尝试使用其他浏览器';
            break;
          default:
            errorMessage = `语音识别错误: ${event.error}`;
            solution = '请重试或尝试：1) 刷新页面 2) 检查麦克风权限 3) 使用其他浏览器';
        }

        const fullMessage = solution ? `${errorMessage}。${solution}` : errorMessage;
        callbacksRef.current.onError?.(fullMessage);
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

  const startListening = React.useCallback(async () => {
    console.log('▶️ Hook: 尝试开始监听 - 移动设备:', isMobile);

    // 检查基础环境
    if (typeof window === 'undefined') {
      console.error('❌ Hook: 运行环境不支持');
      callbacksRef.current.onError?.('语音识别仅在浏览器环境中可用');
      return;
    }

    // 检查浏览器支持
    if (!isSupported) {
      console.error('❌ Hook: 浏览器不支持');
      let errorMsg = '当前浏览器不支持语音识别功能。';
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('chrome')) {
        errorMsg += '建议：使用最新版本的Chrome浏览器';
      } else if (userAgent.includes('safari')) {
        errorMsg += '建议：使用最新版本的Safari浏览器（iOS需iOS 14.5+）';
      } else if (userAgent.includes('edge')) {
        errorMsg += '建议：使用最新版本的Edge浏览器';
      } else {
        errorMsg += '建议：使用Chrome、Safari或Edge浏览器';
      }
      callbacksRef.current.onError?.(errorMsg);
      return;
    }

    // 检查HTTPS要求
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      console.error('❌ Hook: 需要HTTPS');
      callbacksRef.current.onError?.('语音识别需要HTTPS安全连接或localhost环境，请通过正确方式访问网站');
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
        // 统一使用权限检查，提升可靠性
        console.log('🔐 开始检查麦克风权限...');
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          }
        })
        .then((stream) => {
          console.log('✅ 麦克风权限获取成功');
          // 立即关闭流，避免占用
          stream.getTracks().forEach(track => track.stop());

          // 移动端延迟启动，桌面端立即启动
          if (isMobile) {
            console.log('⏳ 移动端延迟启动语音识别...');
            setTimeout(() => {
              if (recognitionRef.current && isStartingRef.current) {
                console.log('🚀 启动移动端语音识别');
                recognitionRef.current.start();
              }
            }, 200);
          } else {
            console.log('🚀 启动桌面端语音识别');
            if (recognitionRef.current && isStartingRef.current) {
              recognitionRef.current.start();
            }
          }
        })
        .catch((error) => {
          console.error('❌ 麦克风权限获取失败:', error.name, error.message);
          isStartingRef.current = false;

          // 根据错误类型提供具体的解决方案
          let errorMsg = '无法获取麦克风权限。';
          let solution = '';

          if (error.name === 'NotAllowedError') {
            errorMsg = '麦克风权限被拒绝。';
            solution = '请在浏览器地址栏左侧点击麦克风图标，允许麦克风访问，然后刷新页面重试。';
          } else if (error.name === 'NotFoundError') {
            errorMsg = '未检测到麦克风设备。';
            solution = '请检查：1) 设备是否连接麦克风 2) 浏览器是否有麦克风权限 3) 其他应用是否正在使用麦克风';
          } else if (error.name === 'NotReadableError') {
            errorMsg = '麦克风被其他应用占用。';
            solution = '请关闭其他使用麦克风的应用（如录音、微信、QQ等），然后重试。';
          } else if (error.name === 'OverconstrainedError') {
            errorMsg = '麦克风不支持所需配置。';
            solution = '请尝试使用其他浏览器或设备。';
          } else {
            errorMsg = `麦克风访问错误: ${error.message}`;
            solution = '请检查麦克风设置并确保已允许浏览器访问。';
          }

          callbacksRef.current.onError?.(errorMsg + ' ' + solution);
        });
      } catch (error) {
        console.error('❌ Hook: 启动失败:', error);
        isStartingRef.current = false;
        callbacksRef.current.onError?.(`启动语音识别失败: ${error instanceof Error ? error.message : String(error)}`);
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