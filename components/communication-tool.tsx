"use client";

import { useState } from 'react';
import { InputForm } from '@/components/input-form';
import { ResponseList } from '@/components/response-list';
import { generateResponses } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useVoiceCommands } from '@/hooks/use-voice-commands';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Command, Mic } from 'lucide-react';

export function CommunicationTool() {
  const [counterpartMessage, setCounterpartMessage] = useState('');
  const [intensityLevel, setIntensityLevel] = useState(5);
  const [responses, setResponses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!counterpartMessage.trim()) {
      toast({
        title: "请输入对方的话",
        description: "需要提供对方的话才能生成回复",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setStreamingResponse('');
    setResponses([]);
    
    try {
      // 保存到localStorage
      saveToLocalStorage(counterpartMessage, intensityLevel);
      
      const generatedResponses = await generateResponses(
        counterpartMessage, 
        intensityLevel,
        (partial) => setStreamingResponse(partial)
      );
      setResponses(generatedResponses);
      setStreamingResponse('');
    } catch (error) {
      console.error("生成回复时出错:", error);
      toast({
        title: "生成回复失败",
        description: "请稍后再试或检查网络连接",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearInput = () => {
    setCounterpartMessage('');
    setResponses([]);
    setStreamingResponse('');
  };

  const saveToLocalStorage = (message: string, intensity: number) => {
    const history = JSON.parse(localStorage.getItem('communicationHistory') || '[]');
    history.unshift({
      message,
      intensity,
      timestamp: new Date().toISOString(),
    });
    
    // 只保留最近10条记录
    const updatedHistory = history.slice(0, 10);
    localStorage.setItem('communicationHistory', JSON.stringify(updatedHistory));
  };

  // 语音命令配置
  const voiceCommands = [
    {
      command: '开始沟通',
      keywords: ['开始沟通', '开始', '生成回复', '提交'],
      action: handleSubmit
    },
    {
      command: '清空输入',
      keywords: ['清空', '清除', '删除', '重置'],
      action: handleClearInput
    },
    {
      command: '增强语气',
      keywords: ['增强语气', '强烈一点', '语气强一点'],
      action: () => setIntensityLevel(Math.min(10, intensityLevel + 2))
    },
    {
      command: '减弱语气',
      keywords: ['减弱语气', '温和一点', '语气轻一点'],
      action: () => setIntensityLevel(Math.max(1, intensityLevel - 2))
    }
  ];

  const {
    isCommandMode,
    startCommandListening,
    stopCommandListening,
    lastCommand,
    isSupported: voiceCommandSupported
  } = useVoiceCommands({
    commands: voiceCommands,
    onCommandRecognized: (command) => {
      toast({
        title: "语音命令识别成功",
        description: `执行命令：${command}`,
      });
    },
    onError: (error) => {
      toast({
        title: "语音命令出错",
        description: error,
        variant: "destructive",
      });
    },
    enabled: !isLoading
  });

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* 语音命令控制面板 */}
      {voiceCommandSupported && (
        <Card className="border border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Command className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-800">语音命令控制</h3>
                  <p className="text-sm text-blue-600">
                    支持："开始沟通"、"清空输入"、"增强语气"、"减弱语气"
                  </p>
                </div>
              </div>
              
              <Button
                variant={isCommandMode ? "destructive" : "outline"}
                size="sm"
                onClick={isCommandMode ? stopCommandListening : startCommandListening}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Mic className={`h-4 w-4 ${isCommandMode ? 'animate-pulse' : ''}`} />
                {isCommandMode ? '停止命令' : '语音命令'}
              </Button>
            </div>
            
            {lastCommand && (
              <div className="mt-2 text-sm text-green-600">
                ✓ 最近执行：{lastCommand}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border border-gray-200">
        <CardContent className="pt-6">
          <InputForm
            counterpartMessage={counterpartMessage}
            setCounterpartMessage={setCounterpartMessage}
            intensityLevel={intensityLevel}
            setIntensityLevel={setIntensityLevel}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {isLoading && streamingResponse && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">正在生成回复...</h2>
          <Card className="response-card border-l-4 border-l-primary shadow-sm">
            <CardContent className="py-4 px-4">
              <div className="whitespace-pre-line text-gray-800">{streamingResponse}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && responses.length > 0 && (
        <ResponseList responses={responses} />
      )}
    </div>
  );
}