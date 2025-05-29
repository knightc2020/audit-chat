"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Mic } from 'lucide-react';

export function VoiceDiagnostics() {
  const [diagnostics, setDiagnostics] = useState({
    speechRecognition: 'checking',
    speechSynthesis: 'checking',
    microphonePermission: 'checking',
    https: 'checking'
  });
  
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const results = { ...diagnostics };

    // 1. 检查语音识别支持
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    results.speechRecognition = SpeechRecognition ? 'supported' : 'not-supported';

    // 2. 检查语音合成支持
    results.speechSynthesis = 'speechSynthesis' in window ? 'supported' : 'not-supported';

    // 3. 检查HTTPS
    results.https = window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? 'supported' : 'not-supported';

    // 4. 检查麦克风权限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      results.microphonePermission = 'granted';
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      results.microphonePermission = 'denied';
    }

    setDiagnostics(results);
  };

  const testSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setTestResult('❌ 浏览器不支持语音识别');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setTestResult('🎤 正在监听...请说话');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTestResult(`✅ 识别成功: "${transcript}"`);
    };

    recognition.onerror = (event) => {
      setTestResult(`❌ 识别失败: ${event.error}`);
    };

    recognition.onend = () => {
      if (!testResult.includes('识别成功')) {
        setTestResult('⏹️ 识别结束');
      }
    };

    try {
      recognition.start();
    } catch (error) {
      setTestResult(`❌ 启动失败: ${error}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'supported':
      case 'granted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'not-supported':
      case 'denied':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string, type: string) => {
    switch (status) {
      case 'supported':
        return type === 'microphonePermission' ? '已授权' : '支持';
      case 'granted':
        return '已授权';
      case 'not-supported':
        return '不支持';
      case 'denied':
        return '被拒绝';
      default:
        return '检查中...';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'supported':
      case 'granted':
        return 'text-green-600';
      case 'not-supported':
      case 'denied':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          语音功能诊断
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 诊断结果 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>语音识别支持</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.speechRecognition)}
              <span className={getStatusColor(diagnostics.speechRecognition)}>
                {getStatusText(diagnostics.speechRecognition, 'speechRecognition')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>语音合成支持</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.speechSynthesis)}
              <span className={getStatusColor(diagnostics.speechSynthesis)}>
                {getStatusText(diagnostics.speechSynthesis, 'speechSynthesis')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>麦克风权限</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.microphonePermission)}
              <span className={getStatusColor(diagnostics.microphonePermission)}>
                {getStatusText(diagnostics.microphonePermission, 'microphonePermission')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>安全连接</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.https)}
              <span className={getStatusColor(diagnostics.https)}>
                {getStatusText(diagnostics.https, 'https')}
              </span>
            </div>
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="space-y-3">
          <Button 
            onClick={testSpeechRecognition}
            className="w-full"
            disabled={diagnostics.speechRecognition !== 'supported' || diagnostics.microphonePermission !== 'granted'}
          >
            测试语音识别
          </Button>
          
          {testResult && (
            <Alert>
              <AlertDescription>{testResult}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* 问题解决建议 */}
        <div className="space-y-2">
          {diagnostics.speechRecognition === 'not-supported' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                您的浏览器不支持语音识别。请使用 Chrome、Edge 或 Safari 浏览器。
              </AlertDescription>
            </Alert>
          )}

          {diagnostics.microphonePermission === 'denied' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                麦克风权限被拒绝。请点击地址栏的🔒图标，允许麦克风权限，然后刷新页面。
              </AlertDescription>
            </Alert>
          )}

          {diagnostics.https === 'not-supported' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                语音识别需要HTTPS连接。请使用https://访问或在localhost上测试。
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Button onClick={runDiagnostics} variant="outline" className="w-full">
          重新检测
        </Button>
      </CardContent>
    </Card>
  );
} 