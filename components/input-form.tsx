"use client";

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Mic, MicOff, Trash2, Volume2, Smartphone } from 'lucide-react';
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
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 语音合成相关
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  // 首先初始化语音合成
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, []);

  // 然后初始化语音识别
  const {
    isListening,
    startListening,
    stopListening,
    transcript,
    isSupported: speechSupported,
    isMobile
  } = useSpeechRecognition({
    onResult: (result) => {
      console.log('📝 InputForm收到语音结果:', result);
      
      if (result.transcript && result.transcript.trim()) {
        // 直接处理结果，不区分移动端和桌面端
        setCounterpartMessage(result.transcript.trim());
        
        // 如果是最终结果，停止识别
        if (result.isFinal) {
          stopListening();
        }
      }
    },
    onError: (error) => {
      console.error('❌ 语音识别错误:', error);
      toast({
        title: "语音识别错误",
        description: error,
        variant: "destructive",
      });
    },
    onStart: () => {
      console.log('🎤 语音识别开始');
      toast({
        title: "开始语音输入",
        description: "请大声说话，系统会自动识别",
      });
    },
    onEnd: () => {
      console.log('🎤 语音识别结束');
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
    },
    continuous: false, // 统一使用非连续模式
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
    if (!speechSupported) {
      toast({
        title: "不支持语音识别",
        description: isMobile 
          ? "您的移动设备不支持语音识别功能，请使用Chrome或Safari最新版" 
          : "您的浏览器不支持语音识别功能，请使用Chrome、Edge或Safari浏览器",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      console.log('🛑 手动停止语音识别');
      stopListening();
      
      // 清除定时器
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
    } else {
      console.log('▶️ 开始语音识别 - 移动设备:', isMobile);
      startListening();
    }
  };

  const handleClearInput = () => {
    setCounterpartMessage('');
    if (isListening) {
      stopListening();
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

    const textToSpeak = counterpartMessage || transcript;
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
  const displayText = counterpartMessage + (transcript ? (counterpartMessage ? ' ' : '') + transcript : '');

  return (
    <div className="space-y-6">
      {/* 移动端使用提示 */}
      {isMobile && (
        <Alert className="border-blue-200 bg-blue-50">
          <Smartphone className="h-4 w-4" />
          <AlertDescription>
            <strong>移动端使用提示：</strong>语音识别将在您停止说话后自动结束，每次只能识别一句话。请在安静环境中使用，说话声音要足够大。
          </AlertDescription>
        </Alert>
      )}

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
              disabled={(!counterpartMessage && !transcript) || isLoading}
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
              disabled={!counterpartMessage && !transcript}
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
              isListening && "border-blue-300 bg-blue-50/50",
              transcript && "text-blue-600"
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
              !speechSupported && "opacity-50 cursor-not-allowed"
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
        {isListening && (
          <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            {isMobile ? '正在识别语音...（移动端模式）' : '正在识别语音...'}
            {transcript && (
              <span className="text-gray-600 font-medium">
                识别中: "{transcript}"
              </span>
            )}
          </div>
        )}
        
        {/* 浏览器不支持提示 */}
        {!speechSupported && (
          <div className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
            💡 您的浏览器不支持语音识别功能，推荐使用Chrome、Edge或Safari浏览器以获得最佳体验
            {isMobile && '（移动端请使用最新版本）'}
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
          disabled={isLoading || (!counterpartMessage.trim() && !transcript.trim())} 
          className="w-full"
        >
          {isLoading ? '生成中...' : '开始沟通'}
          {!isLoading && <Send className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}