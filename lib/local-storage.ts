"use client";

export interface CommunicationHistoryItem {
  message: string;
  intensity: number;
  timestamp: string;
  responses?: string[];
}

export function saveToHistory(item: CommunicationHistoryItem): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getHistory();
    history.unshift(item);
    
    // 只保留最近10条记录
    const updatedHistory = history.slice(0, 10);
    localStorage.setItem('communicationHistory', JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
}

export function getHistory(): CommunicationHistoryItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const historyString = localStorage.getItem('communicationHistory');
    return historyString ? JSON.parse(historyString) : [];
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return [];
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('communicationHistory');
  } catch (error) {
    console.error('清除历史记录失败:', error);
  }
}