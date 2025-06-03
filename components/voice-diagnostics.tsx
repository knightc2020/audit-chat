"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Mic, Smartphone } from 'lucide-react';

// 检测是否为移动设备
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function VoiceDiagnostics() {
  const [diagnostics, setDiagnostics] = useState({
    speechRecognition: 'checking',
    speechSynthesis: 'checking',
    microphonePermission: 'checking',
    https: 'checking',
    isMobile: 'checking',
    userAgent: ''
  });
  
  const [testResult, setTestResult] = useState('');
  const [isTestRunning, setIsTestRunning] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const results = { ...diagnostics };

    // 1. 检查设备类型
    const mobile = isMobileDevice();
    results.isMobile = mobile ? 'mobile' : 'desktop';
    results.userAgent = navigator.userAgent;

    // 2. 检查语音识别支持
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    results.speechRecognition = SpeechRecognition ? 'supported' : 'not-supported';

    // 3. 检查语音合成支持
    results.speechSynthesis = 'speechSynthesis' in window ? 'supported' : 'not-supported';

    // 4. 检查HTTPS
    results.https = window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? 'supported' : 'not-supported';

    // 5. 检查麦克风权限（移动端特殊处理）
    try {
      if (mobile) {
        // 移动端需要更详细的检查
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (permissionStatus.state === 'granted') {
            results.microphonePermission = 'granted';
          } else if (permissionStatus.state === 'denied') {
            results.microphonePermission = 'denied';
          } else {
            results.microphonePermission = 'prompt';
          }
        } catch (permError) {
          // 如果权限查询失败，尝试直接获取媒体流
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            results.microphonePermission = 'granted';
            stream.getTracks().forEach(track => track.stop());
          } catch (mediaError) {
            results.microphonePermission = 'denied';
          }
        }
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        results.microphonePermission = 'granted';
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('权限检查失败:', error);
      results.microphonePermission = 'denied';
    }

    setDiagnostics(results);
  };

  const testSpeechRecognition = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setTestResult('❌ 浏览器不支持语音识别');
      return;
    }

    setIsTestRunning(true);
    setTestResult('🎤 准备开始测试...');

    // 移动端先请求权限
    if (diagnostics.isMobile === 'mobile') {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setTestResult('✅ 权限获取成功，开始语音测试...');
      } catch (error) {
        setTestResult('❌ 权限获取失败，请手动允许麦克风权限');
        setIsTestRunning(false);
        return;
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    
    // 移动端优化配置
    if (diagnostics.isMobile === 'mobile') {
      recognition.continuous = false;
      recognition.interimResults = false;
    } else {
      recognition.continuous = false;
      recognition.interimResults = true;
    }

    let hasResult = false;
    
    const timeout = setTimeout(() => {
      if (!hasResult) {
        recognition.stop();
        setTestResult('⏰ 测试超时，请确保说话声音足够大');
        setIsTestRunning(false);
      }
    }, 10000);

    recognition.onstart = () => {
      setTestResult('🎤 正在监听...请说话（如"你好测试"）');
    };

    recognition.onresult = (event) => {
      hasResult = true;
      clearTimeout(timeout);
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      setTestResult(`✅ 识别成功: "${transcript}" (置信度: ${Math.round(confidence * 100)}%)`);
      setIsTestRunning(false);
    };

    recognition.onerror = (event) => {
      clearTimeout(timeout);
      let errorMsg = '';
      switch (event.error) {
        case 'no-speech':
          errorMsg = '❌ 未检测到语音，请重试';
          break;
        case 'not-allowed':
          errorMsg = '❌ 权限被拒绝，请允许麦克风访问';
          break;
        case 'network':
          errorMsg = '❌ 网络错误';
          break;
        default:
          errorMsg = `❌ 识别失败: ${event.error}`;
      }
      setTestResult(errorMsg);
      setIsTestRunning(false);
    };

    recognition.onend = () => {
      clearTimeout(timeout);
      if (!hasResult && !testResult.includes('成功')) {
        setTestResult('⏹️ 识别结束，未获得结果');
      }
      setIsTestRunning(false);
    };

    try {
      recognition.start();
    } catch (error) {
      clearTimeout(timeout);
      setTestResult(`❌ 启动失败: ${error}`);
      setIsTestRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'supported':
      case 'granted':
      case 'mobile':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'not-supported':
      case 'denied':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'desktop':
      case 'prompt':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string, type: string) => {
    switch (status) {
      case 'supported':
        return '支持';
      case 'granted':
        return '已授权';
      case 'not-supported':
        return '不支持';
      case 'denied':
        return '被拒绝';
      case 'mobile':
        return '移动设备';
      case 'desktop':
        return '桌面设备';
      case 'prompt':
        return '需要授权';
      default:
        return '检查中...';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'supported':
      case 'granted':
      case 'mobile':
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
          {diagnostics.isMobile === 'mobile' ? <Smartphone className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          语音功能诊断 {diagnostics.isMobile === 'mobile' && '(移动端)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 诊断结果 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>设备类型</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.isMobile)}
              <span className={getStatusColor(diagnostics.isMobile)}>
                {getStatusText(diagnostics.isMobile, 'device')}
              </span>
            </div>
          </div>

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
            disabled={
              isTestRunning || 
              diagnostics.speechRecognition !== 'supported' || 
              diagnostics.microphonePermission === 'denied'
            }
          >
            {isTestRunning ? '测试中...' : '测试语音识别'}
          </Button>
          
          {testResult && (
            <Alert>
              <Mic className="h-4 w-4" />
              <AlertDescription>{testResult}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* 移动端专用建议 */}
        <div className="space-y-3">
          {diagnostics.isMobile === 'mobile' && (
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                <strong>移动端使用建议：</strong><br/>
                1. 确保在安静环境中使用<br/>
                2. 说话时音量要足够大<br/>
                3. 每次只能说一句话，停顿后会自动结束<br/>
                4. 如果权限被拒绝，请在浏览器设置中重新允许
              </AlertDescription>
            </Alert>
          )}

          {diagnostics.speechRecognition === 'not-supported' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                您的浏览器不支持语音识别。{diagnostics.isMobile === 'mobile' ? '移动端请使用 Chrome 或 Safari 浏览器的最新版本。' : '请使用 Chrome、Edge 或 Safari 浏览器。'}
              </AlertDescription>
            </Alert>
          )}

          {diagnostics.microphonePermission === 'denied' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                麦克风权限被拒绝。请在浏览器设置中允许麦克风访问，或者：<br/>
                1. 点击地址栏的🔒图标<br/>
                2. 选择"麦克风"权限为"允许"<br/>
                3. 刷新页面
              </AlertDescription>
            </Alert>
          )}

          {diagnostics.https === 'not-supported' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                语音识别需要HTTPS连接。请使用https://访问页面。
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* 用户代理信息 */}
        {diagnostics.userAgent && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">浏览器信息</summary>
            <p className="mt-2 p-2 bg-gray-100 rounded text-xs break-all">
              {diagnostics.userAgent}
            </p>
          </details>
        )}

        <Button onClick={runDiagnostics} variant="outline" className="w-full">
          重新检测
        </Button>
      </CardContent>
    </Card>
  );
} 