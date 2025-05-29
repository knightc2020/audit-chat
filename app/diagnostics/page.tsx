import { VoiceDiagnostics } from '@/components/voice-diagnostics';

export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold text-center mb-8">语音功能诊断</h1>
        <VoiceDiagnostics />
      </div>
    </div>
  );
} 