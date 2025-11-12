// 简单的API测试工具 - 通过内部API路由测试
export async function testOpenRouterAPI(): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // 调用内部测试API路由
    const response = await fetch('/api/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'API测试失败'
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'API返回错误'
      };
    }

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    console.error('❌ API测试异常:', error);

    let errorMessage = '未知错误';
    if (error instanceof TypeError) {
      errorMessage = '网络连接错误，请检查网络设置';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
} 