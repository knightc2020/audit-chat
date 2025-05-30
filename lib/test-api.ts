// 简单的API测试工具
export async function testOpenRouterAPI(): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Audit Communication Tool'
      },
      body: JSON.stringify({
        model: "openchat/openchat-7b:free", // 使用免费模型测试
        messages: [
          {
            role: "user",
            content: "请回复'测试成功'"
          }
        ],
        max_tokens: 50,
        stream: false
      })
    });

    console.log('API测试响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API测试错误:', errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    console.log('API测试成功:', data);
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('API测试异常:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
} 