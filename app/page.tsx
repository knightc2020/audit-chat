import { Header } from '@/components/header';
import { CommunicationTool } from '@/components/communication-tool';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <CommunicationTool />
      </main>
      <footer className="py-4 text-center text-sm text-gray-500 bg-white border-t">
        <p>© {new Date().getFullYear()} 审计沟通利器 - 助您高效沟通</p>
      </footer>
    </div>
  );
}