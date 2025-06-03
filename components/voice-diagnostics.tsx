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
    if (!diagnostics.speechRecognition || diagnostics.speechRecognition !== 'supported') {
      setTestResult('❌ 浏览器不支持语音识别');
      return;
    }

    setIsTestRunning(true);
    setTestResult('🎤 准备开始测试...');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // 移动端先请求权限并进行额外检查
    if (diagnostics.isMobile === 'mobile') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        console.log('✅ 移动端麦克风权限和媒体流获取成功');
        setTestResult('✅ 权限获取成功，开始语音测试...');
        // 关闭媒体流，避免占用
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('❌ 移动端权限获取失败:', error);
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
      recognition.interimResults = false; // 移动端关闭中间结果
      recognition.maxAlternatives = 1;
    } else {
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
    }

    let hasResult = false;
    let resultCount = 0;
    
    const timeout = setTimeout(() => {
      if (!hasResult) {
        console.log('⏰ 测试超时');
        recognition.stop();
        setTestResult('⏰ 测试超时，请确保说话声音足够大且环境安静');
        setIsTestRunning(false);
      }
    }, diagnostics.isMobile === 'mobile' ? 10000 : 15000); // 移动端10秒，桌面端15秒

    recognition.onstart = () => {
      console.log('🎤 语音识别测试开始');
      setTestResult('🎤 正在监听...请说话（如"你好测试"或"今天天气不错"）');
    };

    recognition.onresult = (event) => {
      console.log('🎯 收到识别结果:', event.results);
      resultCount++;
      hasResult = true;
      clearTimeout(timeout);
      
      let transcript = '';
      let confidence = 0;
      let isFinal = false;
      
      // 获取最新的结果
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        transcript += result[0].transcript;
        confidence = Math.max(confidence, result[0].confidence || 0);
        if (result.isFinal) {
          isFinal = true;
        }
      }
      
      console.log(`识别结果 ${resultCount}: "${transcript}", isFinal: ${isFinal}, 置信度: ${confidence}`);
      
      // 移动端和桌面端区别处理
      if (diagnostics.isMobile === 'mobile') {
        // 移动端：只处理最终结果
        if (isFinal && transcript.trim()) {
          setTestResult(
            `✅ 识别成功：「${transcript}」 (置信度: ${Math.round(confidence * 100)}%)`
          );
          setIsTestRunning(false);
        }
      } else {
        // 桌面端：显示所有结果
        if (transcript.trim()) {
          setTestResult(
            `✅ 识别${isFinal ? '成功' : '中...'}：「${transcript}」 (置信度: ${Math.round(confidence * 100)}%)`
          );
          
          // 如果是最终结果，结束测试
          if (isFinal) {
            setIsTestRunning(false);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('❌ 语音识别测试错误:', event.error, event);
      clearTimeout(timeout);
      let errorMsg = '';
      
      if (diagnostics.isMobile === 'mobile') {
        // 移动端专用错误处理
        switch (event.error) {
          case 'no-speech':
            errorMsg = '❌ 未检测到语音，移动端请：1)靠近麦克风说话 2)音量调大 3)确保环境安静';
            break;
          case 'not-allowed':
            errorMsg = '❌ 权限被拒绝，请：1)刷新页面 2)在地址栏点击锁形图标 3)允许麦克风权限';
            break;
          case 'network':
            errorMsg = '❌ 网络错误，请检查网络连接是否稳定';
            break;
          case 'audio-capture':
            errorMsg = '❌ 音频捕获失败，请：1)检查麦克风是否被其他应用占用 2)重启浏览器';
            break;
          case 'service-not-allowed':
            errorMsg = '❌ 语音服务不可用，请使用Chrome或Safari最新版';
            break;
          case 'aborted':
            errorMsg = '⏹️ 识别被中止';
            break;
          default:
            errorMsg = `❌ 识别失败: ${event.error}，请重试或使用桌面端`;
        }
      } else {
        // 桌面端错误处理
        switch (event.error) {
          case 'no-speech':
            errorMsg = '❌ 未检测到语音，请重试（确保环境安静，说话清晰）';
            break;
          case 'not-allowed':
            errorMsg = '❌ 权限被拒绝，请允许麦克风访问后重试';
            break;
          case 'network':
            errorMsg = '❌ 网络错误，请检查网络连接';
            break;
          case 'audio-capture':
            errorMsg = '❌ 音频捕获失败，请检查麦克风设备';
            break;
          case 'service-not-allowed':
            errorMsg = '❌ 语音服务不可用';
            break;
          default:
            errorMsg = `❌ 识别失败: ${event.error}`;
        }
      }
      
      setTestResult(errorMsg);
      setIsTestRunning(false);
    };

    recognition.onend = () => {
      console.log('🏁 语音识别测试结束，hasResult:', hasResult);
      clearTimeout(timeout);
      if (!hasResult) {
        setTestResult('⏹️ 识别结束，未获得结果（请检查麦克风是否工作正常）');
      }
      setIsTestRunning(false);
    };

    try {
      console.log('🚀 启动语音识别测试');
      recognition.start();
    } catch (error) {
      console.error('❌ 启动语音识别失败:', error);
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