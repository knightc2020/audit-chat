// 简单的API测试工具
export async function testOpenRouterAPI(): Promise<{ success: boolean; error?: string; data?: any }> {
  // 检查环境变量
  const API_BASE_URL = process.env.NEXT_PUBLIC_OPENROUTER_API_BASE_URL || "https://openrouter.ai/api/v1";
  const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

  if (!API_KEY) {
    return {
      success: false,
      error: 'API密钥未配置，请检查环境变量 NEXT_PUBLIC_OPENROUTER_API_KEY'
    };
  }

  console.log('🔧 API测试配置:', {
    baseURL: API_BASE_URL,
    keyLength: API_KEY.length,
    keyPrefix: API_KEY.substring(0, 10) + '...'
  });

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'Audit Communication Tool'
      },
      body: JSON.stringify({
        model: "kwaipilot/kat-coder-pro:free", // 使用可靠的免费模型测试
        messages: [
          {
            role: "system",
            content: "你是一个专业的AI助手。"
          },
          {
            role: "user",
            content: "请回复'测试成功'"
          }
        ],
        max_tokens: 50,
        temperature: 0.7,
        stream: false
      })
    });

    console.log('API测试响应状态:', response.status, response.statusText);

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = '无法获取错误信息';
      }

      console.error('API测试错误:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      // 提供更详细的错误信息
      let errorMessage = '';
      if (response.status === 401) {
        errorMessage = 'API密钥无效或已过期，请检查 NEXT_PUBLIC_OPENROUTER_API_KEY 环境变量';
      } else if (response.status === 429) {
        errorMessage = '请求频率限制，请稍后重试';
      } else if (response.status >= 500) {
        errorMessage = 'OpenRouter服务器错误，请稍后重试';
      } else {
        errorMessage = `HTTP ${response.status}: ${errorText || response.statusText}`;
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    const data = await response.json();
    console.log('✅ API测试成功:', {
      model: data.model || 'unknown',
      choices: data.choices?.length || 0,
      usage: data.usage
    });

    return {
      success: true,
      data: {
        model: data.model,
        content: data.choices?.[0]?.message?.content,
        usage: data.usage
      }
    };
  } catch (error) {
    console.error('❌ API测试异常:', error);

    let errorMessage = '未知错误';
    if (error instanceof TypeError) {
      errorMessage = '网络连接错误，请检查网络或CORS设置';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
} 