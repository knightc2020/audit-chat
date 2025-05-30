"use client";

// 使用环境变量获取API配置，避免硬编码敏感信息
const API_BASE_URL = process.env.NEXT_PUBLIC_OPENROUTER_API_BASE_URL || "https://openrouter.ai/api/v1";
const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

// 检查API密钥是否已配置
if (!API_KEY) {
  console.error('❌ OpenRouter API密钥未配置！请检查环境变量 NEXT_PUBLIC_OPENROUTER_API_KEY');
}

// 主导出函数 - 优先尝试流式调用，失败时使用非流式调用
export async function generateResponses(
  counterpartMessage: string,
  intensityLevel: number,
  onPartialResponse?: (partial: string) => void
): Promise<string[]> {
  // 检查API密钥
  if (!API_KEY) {
    throw new Error('API密钥未配置，请在环境变量中设置 NEXT_PUBLIC_OPENROUTER_API_KEY');
  }

  try {
    // 首先尝试流式调用
    return await generateResponsesStream(counterpartMessage, intensityLevel, onPartialResponse);
  } catch (error) {
    console.warn('流式调用失败，尝试非流式调用:', error);
    // 如果流式调用失败，尝试非流式调用
    return await generateResponsesNonStream(counterpartMessage, intensityLevel);
  }
}

// 流式API调用方法
async function generateResponsesStream(
  counterpartMessage: string,
  intensityLevel: number,
  onPartialResponse?: (partial: string) => void
): Promise<string[]> {
  const prompt = createPrompt(counterpartMessage, intensityLevel);
  
  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'Audit Communication Tool'
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-v3-base:free", // 使用正确的DeepSeek V3 Base免费模型
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('流式API错误响应:', response.status, response.statusText, errorText);
    
    if (response.status === 401) {
      throw new Error('API密钥无效或已过期，请检查 NEXT_PUBLIC_OPENROUTER_API_KEY 环境变量');
    }
    
    throw new Error(`流式API请求失败: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('流式响应体为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onPartialResponse?.(fullContent);
            }
          } catch (e) {
            // 忽略解析错误的数据块
            console.warn('解析数据块失败:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  if (!fullContent.trim()) {
    throw new Error('流式调用未收到有效的AI回复内容');
  }
  
  return parseResponses(fullContent);
}

// 备用的非流式API调用方法
async function generateResponsesNonStream(
  counterpartMessage: string,
  intensityLevel: number
): Promise<string[]> {
  const prompt = createPrompt(counterpartMessage, intensityLevel);
  
  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'Audit Communication Tool'
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-v3-base:free", // 使用正确的DeepSeek V3 Base免费模型
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: false, // 非流式
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('非流式API错误响应:', response.status, response.statusText, errorText);
    
    // 提供更详细的错误信息
    if (response.status === 401) {
      throw new Error("API密钥无效或已过期，请检查 NEXT_PUBLIC_OPENROUTER_API_KEY 环境变量");
    } else if (response.status === 429) {
      throw new Error("请求过于频繁，请稍后再试");
    } else if (response.status >= 500) {
      throw new Error("服务器内部错误，请稍后再试");
    } else {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';
  
  if (!content.trim()) {
    throw new Error('非流式调用未收到有效的AI回复内容');
  }
  
  return parseResponses(content);
}

function createPrompt(counterpartMessage: string, intensityLevel: number): string {
  const intensityDescription = getIntensityDescription(intensityLevel);
  
  // 针对DeepSeek V3 Base基础模型优化提示词结构
  return `你是一位专业的审计专家，具有丰富的审计经验和深厚的法律法规知识。

<任务说明>
审计对象回应: "${counterpartMessage}"
沟通强度要求: ${intensityDescription}（强度级别：${intensityLevel}/10）

<输出要求>
请生成3种不同风格的专业回复，每个回复都要：
1. 基于具体事实和专业判断指出问题
2. 引用具体的法律法规、行业标准或最佳实践
3. 清晰说明不合规可能带来的具体风险
4. 提供明确、可执行的整改建议
5. 保持专业、客观的语气，符合指定的沟通强度

<输出格式>
请严格按照以下格式输出，每个回复之间用"---"分隔：

回复1内容
---
回复2内容  
---
回复3内容

注意：只输出可以直接使用的回复内容，不要添加编号、标题或其他解释文字。`;
}

function getIntensityDescription(level: number): string {
  if (level <= 3) return "温和，注重合作，但不失专业性";
  if (level <= 6) return "坚定专业，直接指出问题，语气适中";
  return "强硬专业，直接指出严重问题，语气坚决，不容商榷";
}

function parseResponses(content: string): string[] {
  // 尝试用分隔符分割
  const responses = content.split('---').map(r => r.trim()).filter(r => r);
  
  // 如果成功分割出至少3条回复，直接返回前3条
  if (responses.length >= 3) {
    return responses.slice(0, 3);
  }
  
  // 如果未能正确分割，尝试用其他可能的分隔方式
  const alternativeResponses = content
    .split(/\n\s*(?:回复[：:]?|选项[：:]?|\d+[\.、][：:]?|\n-{3,}|\n={3,})/i)
    .map(r => r.trim())
    .filter(r => r && r.length > 30); // 过滤掉太短的内容
  
  if (alternativeResponses.length >= 3) {
    return alternativeResponses.slice(0, 3);
  }
  
  // 如果还是无法得到3条回复，则将整个内容作为一条回复，并添加两条默认回复
  return [
    content.trim(),
    "基于相关法律法规和行业标准，您提出的情况存在合规风险。建议及时调整相关做法，完善内部控制，规范操作流程。我们可以一起讨论如何在确保合规的前提下优化业务流程。",
    "根据专业判断，您描述的情况需要进行整改。建议您组织相关人员开展自查，完善制度流程，确保各项操作符合规范要求。我们愿意提供专业建议，协助您达到合规要求。"
  ];
}