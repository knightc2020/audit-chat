"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SimpleVoiceTest() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startRecognition = () => {
    addLog('开始语音识别测试');
    setError('');
    setTranscript('');

    // 检查浏览器支持
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      const errorMsg = '浏览器不支持语音识别';
      setError(errorMsg);
      addLog(`错误: ${errorMsg}`);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      addLog('语音识别已启动');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      addLog(`收到识别结果，结果数量: ${event.results.length}`);
      
      let latestTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        addLog(`结果 ${i}: "${result[0].transcript}", isFinal: ${result.isFinal}, confidence: ${result[0].confidence}`);
        
        if (result[0].transcript) {
          latestTranscript = result[0].transcript;
        }
      }
      
      if (latestTranscript) {
        setTranscript(latestTranscript);
        addLog(`设置转录文本: "${latestTranscript}"`);
      }
    };

    recognition.onerror = (event) => {
      const errorMsg = `语音识别错误: ${event.error}`;
      addLog(errorMsg);
      setError(errorMsg);
      setIsListening(false);
    };

    recognition.onend = () => {
      addLog('语音识别已结束');
      setIsListening(false);
    };

    try {
      recognition.start();
      addLog('调用 recognition.start()');
    } catch (err) {
      const errorMsg = `启动失败: ${err}`;
      addLog(errorMsg);
      setError(errorMsg);
    }
  };

  const stopRecognition = () => {
    addLog('手动停止语音识别');
    setIsListening(false);
    // 这里不直接操作recognition对象，因为它在函数作用域内
  };

  const clearLog = () => {
    setLog([]);
    setTranscript('');
    setError('');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>简化语音识别测试</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 控制按钮 */}
        <div className="flex gap-2">
          <Button 
            onClick={startRecognition} 
            disabled={isListening}
            variant={isListening ? "secondary" : "default"}
          >
            {isListening ? '🎤 正在监听...' : '开始语音识别'}
          </Button>
          <Button onClick={clearLog} variant="outline">
            清空日志
          </Button>
        </div>

        {/* 状态显示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 识别结果 */}
          <div>
            <h3 className="font-medium mb-2">识别结果:</h3>
            <div className="p-3 bg-gray-100 rounded min-h-[100px] border">
              {transcript ? (
                <span className="text-blue-600 font-medium">{transcript}</span>
              ) : (
                <span className="text-gray-500">暂无识别结果</span>
              )}
            </div>
          </div>

          {/* 错误信息 */}
          <div>
            <h3 className="font-medium mb-2">错误信息:</h3>
            <div className="p-3 bg-red-50 rounded min-h-[100px] border">
              {error ? (
                <span className="text-red-600">{error}</span>
              ) : (
                <span className="text-gray-500">无错误</span>
              )}
            </div>
          </div>
        </div>

        {/* 详细日志 */}
        <div>
          <h3 className="font-medium mb-2">详细日志:</h3>
          <div className="p-3 bg-gray-50 rounded max-h-[300px] overflow-y-auto border font-mono text-sm">
            {log.length > 0 ? (
              log.map((entry, index) => (
                <div key={index} className="mb-1">
                  {entry}
                </div>
              ))
            ) : (
              <span className="text-gray-500">暂无日志</span>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 p-4 rounded border">
          <h3 className="font-medium mb-2">测试说明:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>点击"开始语音识别"按钮</li>
            <li>允许浏览器访问麦克风权限</li>
            <li>清晰地说一句话，比如"你好世界"</li>
            <li>观察识别结果和详细日志</li>
            <li>如果有问题，查看错误信息</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

// 声明全局类型
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
} 