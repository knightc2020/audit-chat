"use client";

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckCheck, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ResponseListProps {
  responses: string[];
}

export function ResponseList({ responses }: ResponseListProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const { toast } = useToast();

  // 初始化语音合成
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, []);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "复制成功",
        description: "回复内容已复制到剪贴板",
      });
    }).catch(() => {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "destructive",
      });
    });
  };

  const handleSpeak = (text: string, index: number) => {
    if (!speechSynthesisRef.current) {
      toast({
        title: "不支持语音合成",
        description: "您的浏览器不支持语音合成功能",
        variant: "destructive",
      });
      return;
    }

    // 如果正在播放当前项，则停止
    if (speakingIndex === index) {
      speechSynthesisRef.current.cancel();
      setSpeakingIndex(null);
      return;
    }

    // 停止之前的播放
    if (speakingIndex !== null) {
      speechSynthesisRef.current.cancel();
      setSpeakingIndex(null);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => {
      setSpeakingIndex(index);
    };

    utterance.onend = () => {
      setSpeakingIndex(null);
    };

    utterance.onerror = () => {
      setSpeakingIndex(null);
      toast({
        title: "语音播放失败",
        description: "语音合成出现错误",
        variant: "destructive",
      });
    };

    speechSynthesisRef.current.speak(utterance);
  };

  // 清理语音合成
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">沟通建议回复</h2>
      <div className="space-y-4">
        {responses.map((response, index) => (
          <Card key={index} className="response-card border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row justify-between items-center">
              <h3 className="font-medium text-gray-700">回复选项 {index + 1}</h3>
              <div className="flex gap-1">
                {/* 语音播放按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSpeak(response, index)}
                  className={cn(
                    "h-8 px-2 text-gray-500 hover:text-gray-700",
                    speakingIndex === index && "bg-blue-50 text-blue-600 hover:text-blue-700"
                  )}
                  title={speakingIndex === index ? "停止播放" : "播放回复"}
                >
                  {speakingIndex === index ? (
                    <>
                      <VolumeX className="h-4 w-4 mr-1 animate-pulse" />
                      停止
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-1" />
                      播放
                    </>
                  )}
                </Button>

                {/* 复制按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(response, index)}
                  className="h-8 px-2 text-gray-500 hover:text-gray-700"
                  title="复制回复"
                >
                  {copiedIndex === index ? (
                    <>
                      <CheckCheck className="h-4 w-4 mr-1 text-green-600" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      复制
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4">
              <div className={cn(
                "whitespace-pre-line text-gray-800",
                speakingIndex === index && "bg-blue-50/50 p-3 rounded-md"
              )}>
                {response}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* 语音播放提示 */}
      {speakingIndex !== null && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Volume2 className="h-4 w-4 animate-pulse" />
          正在播放回复选项 {speakingIndex + 1}
        </div>
      )}
    </div>
  );
}