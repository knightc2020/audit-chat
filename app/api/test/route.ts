import { NextRequest, NextResponse } from 'next/server';

// API测试端点 - 验证OpenRouter连接
export async function GET(request: NextRequest) {
  try {
    // 从环境变量获取API配置（服务器端安全）
    const API_BASE_URL = process.env.OPENROUTER_API_BASE_URL || "https://openrouter.ai/api/v1";
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API密钥未配置' },
        { status: 500 }
      );
    }

    console.log('🔧 API测试配置:', {
      baseURL: API_BASE_URL,
      keyLength: API_KEY.length,
      keyPrefix: API_KEY.substring(0, 10) + '...'
    });

    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://audit-chat.vercel.app',
        'X-Title': 'Audit Communication Tool'
      },
      body: JSON.stringify({
        model: "kwaipilot/kat-coder-pro:free",
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

      let errorMessage = '';
      if (response.status === 401) {
        errorMessage = 'API密钥无效或已过期';
      } else if (response.status === 429) {
        errorMessage = '请求频率限制，请稍后重试';
      } else if (response.status >= 500) {
        errorMessage = 'OpenRouter服务器错误，请稍后重试';
      } else {
        errorMessage = `HTTP ${response.status}: ${errorText || response.statusText}`;
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const data = await response.json();
    console.log('✅ API测试成功:', {
      model: data.model || 'unknown',
      choices: data.choices?.length || 0,
      usage: data.usage
    });

    return NextResponse.json({
      success: true,
      data: {
        model: data.model,
        content: data.choices?.[0]?.message?.content,
        usage: data.usage
      }
    });

  } catch (error) {
    console.error('❌ API测试异常:', error);

    let errorMessage = '未知错误';
    if (error instanceof TypeError) {
      errorMessage = '网络连接错误，请检查网络或CORS设置';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
