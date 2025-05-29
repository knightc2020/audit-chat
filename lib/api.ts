"use client";

import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "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",
  dangerouslyAllowBrowser: true
});

export async function generateResponses(
  counterpartMessage: string,
  intensityLevel: number,
  onPartialResponse?: (partial: string) => void
): Promise<string[]> {
  try {
    const prompt = createPrompt(counterpartMessage, intensityLevel);
    
    const stream = await client.chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
      onPartialResponse?.(fullContent);
    }
    
    return parseResponses(fullContent);
  } catch (error) {
    console.error("API请求失败:", error);
    throw new Error("生成回复失败，请稍后再试");
  }
}

function createPrompt(counterpartMessage: string, intensityLevel: number): string {
  const intensityDescription = getIntensityDescription(intensityLevel);
  
  return `你是一位经验丰富的审计专家，需要对以下审计对象的回应进行专业沟通。

审计对象说: "${counterpartMessage}"

请生成3种不同的回复方式。每个回复需要：
1. 基于具体事实和专业判断指出问题
2. 引用具体的法律法规、行业标准或最佳实践
3. 清晰说明不合规可能带来的具体风险
4. 提供明确、可执行的整改建议
5. 保持专业、客观的语气，强度符合要求：${intensityDescription}（${intensityLevel}/10分）

请直接提供3条完整的回复，每条回复之间用"---"分隔。不要加入编号或其他解释，只需提供可以直接使用的回复内容。`;
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