"use client";

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Send, Mic, MicOff, Trash2, Volume2 } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface InputFormProps {
  counterpartMessage: string;
  setCounterpartMessage: (value: string) => void;
  intensityLevel: number;
  setIntensityLevel: (value: number) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function InputForm({
  counterpartMessage,
  setCounterpartMessage,
  intensityLevel,
  setIntensityLevel,
  onSubmit,
  isLoading
}: InputFormProps) {
  const { toast } = useToast();
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 语音合成相关
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  // 初始化语音合成
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, []);

  const {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    onResult: (result) => {
      console.log('🎤 语音识别结果:', result);
      setCurrentTranscript(result.transcript);
      
      // 处理最终结果
      if (result.isFinal && result.transcript.trim()) {
        console.log('✅ 最终结果，立即添加到输入框:', result.transcript);
        const newMessage = counterpartMessage + (counterpartMessage ? ' ' : '') + result.transcript.trim();
        setCounterpartMessage(newMessage);
        setCurrentTranscript('');
        
        // 清除超时定时器
        if (recognitionTimeoutRef.current) {
          clearTimeout(recognitionTimeoutRef.current);
          recognitionTimeoutRef.current = null;
        }
      } 
      // 处理中间结果 - 设置延迟添加
      else if (!result.isFinal && result.transcript.trim().length > 2) {
        console.log('⏳ 中间结果，设置延迟添加:', result.transcript);
        
        // 清除之前的定时器
        if (recognitionTimeoutRef.current) {
          clearTimeout(recognitionTimeoutRef.current);
        }
        
        // 设置新的定时器
        recognitionTimeoutRef.current = setTimeout(() => {
          console.log('⏰ 延迟时间到，添加中间结果到输入框:', result.transcript);
          const newMessage = counterpartMessage + (counterpartMessage ? ' ' : '') + result.transcript.trim();
          setCounterpartMessage(newMessage);
          setCurrentTranscript('');
          
          // 停止识别
          stopListening();
          setIsRecognizing(false);
        }, 2000); // 增加到2秒
      }
    },
    onError: (error) => {
      console.error('❌ 语音识别错误:', error);
      toast({
        title: "语音识别出错",
        description: error,
        variant: "destructive",
      });
      setIsRecognizing(false);
      setCurrentTranscript('');
      
      // 清除定时器
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
    },
    onStart: () => {
      console.log('🎬 语音识别开始');
      setIsRecognizing(true);
      toast({
        title: "开始语音识别",
        description: "请说话，停顿2秒后将自动添加到输入框",
      });
    },
    onEnd: () => {
      console.log('🏁 语音识别结束');
      setIsRecognizing(false);
      
      // 如果还有未处理的文字，立即添加到输入框
      if (currentTranscript && currentTranscript.trim()) {
        console.log('🔚 识别结束时添加剩余文字:', currentTranscript);
        const newMessage = counterpartMessage + (counterpartMessage ? ' ' : '') + currentTranscript.trim();
        setCounterpartMessage(newMessage);
        setCurrentTranscript('');
      }
      
      // 清除定时器
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
    },
    continuous: true,
    language: 'zh-CN'
  });

  // 清理定时器
  useEffect(() => {
    return () => {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
    };
  }, []);

  const handleVoiceInput = () => {
    if (!isSupported) {
      toast({
        title: "不支持语音识别",
        description: "您的浏览器不支持语音识别功能，请使用Chrome、Edge或Safari浏览器",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      console.log('🛑 手动停止语音识别');
      stopListening();
      setIsRecognizing(false);
      
      // 清除定时器
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
    } else {
      console.log('▶️ 开始语音识别');
      resetTranscript();
      setCurrentTranscript('');
      startListening();
    }
  };

  const handleClearInput = () => {
    setCounterpartMessage('');
    setCurrentTranscript('');
    if (isListening) {
      stopListening();
      setIsRecognizing(false);
    }
    
    // 清除定时器
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
  };

  // 语音播放当前输入内容
  const handleSpeakText = () => {
    if (!speechSynthesisRef.current) {
      toast({
        title: "不支持语音合成",
        description: "您的浏览器不支持语音合成功能",
        variant: "destructive",
      });
      return;
    }

    if (isSpeaking) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = counterpartMessage || currentTranscript;
    if (!textToSpeak.trim()) {
      toast({
        title: "没有内容",
        description: "请先输入文字或使用语音录入",
        variant: "destructive",
      });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast({
        title: "语音播放失败",
        description: "语音合成出现错误",
        variant: "destructive",
      });
    };

    speechSynthesisRef.current.speak(utterance);
  };

  // 显示的文本内容
  const displayText = counterpartMessage + (currentTranscript ? (counterpartMessage ? ' ' : '') + currentTranscript : '');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label htmlFor="counterpart-message" className="text-base font-medium">
            对方的话
          </Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSpeakText}
              disabled={(!counterpartMessage && !currentTranscript) || isLoading}
              className={cn(
                "flex items-center gap-1",
                isSpeaking && "bg-blue-50 border-blue-300"
              )}
            >
              <Volume2 className={cn("h-3 w-3", isSpeaking && "text-blue-600")} />
              {isSpeaking ? '停止播放' : '播放'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearInput}
              disabled={!counterpartMessage && !currentTranscript}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              清空
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Textarea
            id="counterpart-message"
            name="counterpart-message"
            placeholder="请输入对方所说的内容，或点击麦克风使用语音输入..."
            className={cn(
              "mt-2 min-h-[120px] pr-12",
              isRecognizing && "border-blue-300 bg-blue-50/50",
              currentTranscript && "text-blue-600"
            )}
            value={displayText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCounterpartMessage(e.target.value)}
          />
          
          {/* 语音输入按钮 */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleVoiceInput}
            disabled={isLoading}
            className={cn(
              "absolute right-2 top-4 h-8 w-8 p-0",
              isListening && "bg-red-100 hover:bg-red-200 text-red-600",
              !isSupported && "opacity-50 cursor-not-allowed"
            )}
            title={isListening ? "停止语音输入" : "开始语音输入"}
          >
            {isListening ? (
              <MicOff className="h-4 w-4 animate-pulse" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* 语音识别状态提示 */}
        {isRecognizing && (
          <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            正在识别语音...
            {currentTranscript && (
              <span className="text-gray-600 font-medium">
                识别中: "{currentTranscript}"
              </span>
            )}
          </div>
        )}
        
        {/* 浏览器不支持提示 */}
        {!isSupported && (
          <div className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
            💡 您的浏览器不支持语音识别功能，推荐使用Chrome、Edge或Safari浏览器以获得最佳体验
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="intensity-level" className="text-base font-medium">
              语气强烈程度
            </Label>
            <span className="text-sm font-medium bg-primary text-white px-2 py-1 rounded-md">
              {intensityLevel}
            </span>
          </div>
          <div className="py-4">
            <Slider
              id="intensity-level"
              min={1}
              max={10}
              step={1}
              value={[intensityLevel]}
              onValueChange={(value: number[]) => setIntensityLevel(value[0])}
              className="cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>温和</span>
            <span>适中</span>
            <span>强烈</span>
          </div>
        </div>

        <Button 
          onClick={onSubmit} 
          disabled={isLoading || (!counterpartMessage.trim() && !currentTranscript.trim())} 
          className="w-full"
        >
          {isLoading ? '生成中...' : '开始沟通'}
          {!isLoading && <Send className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}