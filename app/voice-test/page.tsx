import { VoiceDiagnostics } from '@/components/voice-diagnostics';

export default function VoiceTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">
          语音功能测试
        </h1>
        <p className="text-center text-gray-600 mb-8">
          自动检测设备类型并提供针对性的语音功能诊断
        </p>
        <div className="max-w-3xl mx-auto">
          <VoiceDiagnostics />
        </div>
      </div>
    </div>
  );
} 