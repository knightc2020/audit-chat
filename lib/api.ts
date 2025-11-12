"use client";

// 通过内部API路由调用，保护API密钥安全
// 不在客户端直接暴露任何敏感信息

// 主导出函数 - 通过内部API路由调用
export async function generateResponses(
  counterpartMessage: string,
  intensityLevel: number,
  onPartialResponse?: (partial: string) => void
): Promise<string[]> {
  try {
    // 调用内部API路由，不暴露API密钥
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        counterpartMessage,
        intensityLevel,
        stream: !!onPartialResponse,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API调用失败');
    }

    if (!data.success) {
      throw new Error(data.error || 'API返回错误');
    }

    return data.responses || [];
  } catch (error) {
    console.error('生成回复失败:', error);
    throw error;
  }
}
