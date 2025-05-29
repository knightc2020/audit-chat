import { MessageSquare } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-gray-800">审计沟通利器</h1>
        </div>
        <div className="text-sm text-gray-500">
          专业·高效·有理有据
        </div>
      </div>
    </header>
  );
}