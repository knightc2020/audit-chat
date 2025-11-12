import { NextRequest, NextResponse } from 'next/server';

// 服务器端API路由 - 保护API密钥安全
export async function POST(request: NextRequest) {
  try {
    // 从环境变量获取API配置（服务器端安全）
    const API_BASE_URL = process.env.OPENROUTER_API_BASE_URL || "https://openrouter.ai/api/v1";
    const API_KEY = process.env.OPENROUTER_API_KEY;

    // 检查API密钥
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API密钥未配置' },
        { status: 500 }
      );
    }

    // 从请求体获取参数
    const { counterpartMessage, intensityLevel, stream } = await request.json();

    if (!counterpartMessage || typeof intensityLevel !== 'number') {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 创建提示词
    const prompt = createPrompt(counterpartMessage, intensityLevel);
    const apiConfig = getAPIConfig(intensityLevel);

    // 定义可用的免费模型列表
    const FREE_MODELS = [
      "kwaipilot/kat-coder-pro:free",
      "minimax/minimax-m2:free",
      "nvidia/nemotron-nano-12b-v2-vl:free"
    ];

    // 尝试多个模型，直到成功
    for (const model of FREE_MODELS) {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': 'https://audit-chat.vercel.app',
            'X-Title': 'Audit Communication Tool'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: "你是一位经验丰富的审计专家，具备优秀的沟通技巧和深厚的专业素养。请根据要求生成专业、实用的审计沟通回复。"
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: apiConfig.temperature,
            max_tokens: apiConfig.maxTokens,
            top_p: apiConfig.topP,
            frequency_penalty: apiConfig.frequencyPenalty,
            presence_penalty: apiConfig.presencePenalty,
            stream: stream || false,
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`模型 ${model} 调用失败:`, response.status, errorText);

          if (response.status === 401) {
            return NextResponse.json(
              { error: 'API密钥无效或已过期' },
              { status: 401 }
            );
          }

          // 继续尝试下一个模型
          continue;
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';

        if (!content.trim()) {
          console.warn(`模型 ${model} 未返回有效内容，尝试下一个模型`);
          continue;
        }

        console.log(`✅ 成功使用模型: ${model}`);

        // 解析回复
        const responses = parseResponses(content);

        return NextResponse.json({
          success: true,
          responses,
          model
        });

      } catch (error) {
        console.warn(`模型 ${model} 出现错误:`, error);
        continue;
      }
    }

    // 所有模型都失败了
    return NextResponse.json(
      { error: '所有可用的免费模型都无法使用' },
      { status: 500 }
    );

  } catch (error) {
    console.error('API路由错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

function createPrompt(counterpartMessage: string, intensityLevel: number): string {
  const intensityDescription = getIntensityDescription(intensityLevel);
  const responseStyles = getResponseStyles(intensityLevel);
  const situationAnalysis = analyzeSituation(counterpartMessage);

  return `你是一位经验丰富的审计专家，具有优秀的沟通技巧和深厚的专业素养。请根据审计对象的回应，生成专业而有效的沟通回复。

<对方回应>
"${counterpartMessage}"

<沟通策略>
${situationAnalysis}
沟通语气: ${intensityDescription}（强度级别：${intensityLevel}/10）

<回复要求>
请生成3种不同风格的专业回复：

【${responseStyles.style1}】
- 采用${responseStyles.approach1}的方式
- 重点关注${responseStyles.focus1}
- 语言风格：${responseStyles.tone1}

【${responseStyles.style2}】
- 采用${responseStyles.approach2}的方式
- 重点关注${responseStyles.focus2}
- 语言风格：${responseStyles.tone2}

【${responseStyles.style3}】
- 采用${responseStyles.approach3}的方式
- 重点关注${responseStyles.focus3}
- 语言风格：${responseStyles.tone3}

<专业要求>
每个回复都应该：
✓ 体现专业水准，但避免过度专业术语
✓ 根据情况适当引用相关规定（不强制）
✓ 提供建设性的解决思路
✓ 保持审计人员的权威性和可信度
✓ 语言自然流畅，符合实际沟通习惯

<输出格式>
直接输出3个回复内容，每个回复之间用"---"分隔，不需要标题或编号：

第一个回复内容
---
第二个回复内容
---
第三个回复内容`;
}

function getIntensityDescription(level: number): string {
  const descriptions = [
    "",
    "极其温和，以理解和引导为主，营造合作氛围",
    "温和友善，重视对方感受，循序渐进地指出问题",
    "温和但明确，既保持礼貌又清晰表达专业立场",
    "适度坚定，平衡专业要求与沟通效果",
    "中等强度，直接明确地指出问题，保持专业客观",
    "较为坚定，重点突出问题的重要性和紧迫性",
    "坚定直接，强调合规要求的不可妥协性",
    "强硬专业，明确指出严重性，要求立即整改",
    "非常强硬，直接指出严重违规，态度不容商榷",
    "极其强硬，涉及重大违规，必须立即纠正，后果严重"
  ];

  return descriptions[Math.min(level, 10)] || descriptions[5];
}

function getResponseStyles(intensityLevel: number) {
  if (intensityLevel <= 3) {
    return {
      style1: "建议引导型",
      approach1: "温和建议",
      focus1: "共同寻找解决方案",
      tone1: "亲和、理解、建设性",

      style2: "协作沟通型",
      approach2: "协作讨论",
      focus2: "双方合作改进",
      tone2: "友善、开放、支持性",

      style3: "专业指导型",
      approach3: "专业指导",
      focus3: "提供专业建议",
      tone3: "专业、耐心、详细"
    };
  } else if (intensityLevel <= 6) {
    return {
      style1: "平衡沟通型",
      approach1: "既友善又明确",
      focus1: "平衡关系与要求",
      tone1: "专业、友善、明确",

      style2: "事实分析型",
      approach2: "基于事实分析",
      focus2: "客观分析问题",
      tone2: "客观、理性、专业",

      style3: "解决方案型",
      approach3: "聚焦解决方案",
      focus3: "具体可行的改进措施",
      tone3: "务实、专业、积极"
    };
  } else {
    return {
      style1: "直接明确型",
      approach1: "直接指出问题",
      focus1: "问题的严重性",
      tone1: "坚定、直接、权威",

      style2: "规范要求型",
      approach2: "强调合规要求",
      focus2: "法规要求和风险",
      tone2: "严肃、专业、不容商榷",

      style3: "权威指导型",
      approach3: "权威性指导",
      focus3: "必须执行的整改措施",
      tone3: "权威、坚决、明确"
    };
  }
}

function analyzeSituation(message: string): string {
  const lowercaseMessage = message.toLowerCase();

  if (/不是|没有|不对|不存在|不可能|推脱|拒绝/.test(message)) {
    return "对方表现出抗拒或否认态度，需要用事实和耐心来说服，避免直接对抗。";
  }

  if (/困难|难以|无法|不好|复杂|麻烦/.test(message)) {
    return "对方表达了困难，需要理解其处境的同时，提供可行的解决方案。";
  }

  if (/会|好的|明白|理解|配合|支持|改进/.test(message)) {
    return "对方表现出配合态度，应该给予肯定并提供具体的指导建议。";
  }

  if (/因为|由于|原因|情况|实际|现实/.test(message)) {
    return "对方在解释情况，需要认真听取并基于实际情况提供专业建议。";
  }

  return "根据对方的回应，需要保持专业客观的态度，既要坚持审计原则，又要促进有效沟通。";
}

function getAPIConfig(intensityLevel: number) {
  if (intensityLevel <= 3) {
    return {
      temperature: 0.8,
      maxTokens: 2000,
      topP: 0.9,
      frequencyPenalty: 0.3,
      presencePenalty: 0.2
    };
  } else if (intensityLevel <= 6) {
    return {
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.85,
      frequencyPenalty: 0.4,
      presencePenalty: 0.3
    };
  } else {
    return {
      temperature: 0.6,
      maxTokens: 2000,
      topP: 0.8,
      frequencyPenalty: 0.5,
      presencePenalty: 0.4
    };
  }
}

function parseResponses(content: string): string[] {
  const cleanContent = content.trim();

  let responses = cleanContent.split('---').map(r => r.trim()).filter(r => r && r.length > 20);

  if (responses.length >= 3) {
    return responses.slice(0, 3).map(response => cleanupResponse(response));
  }

  const alternativePatterns = [
    /\n\s*[-]{3,}\s*\n/g,
    /\n\s*第[一二三1-3]个?[回答回复]\s*[：:]\s*/gi,
    /\n\s*[1-3][\.、][：:]?\s*/g,
    /\n\s*回复[1-3][：:]?\s*/gi,
    /\n\s*【[^】]*】\s*/g,
    /\n\n+/g
  ];

  for (const pattern of alternativePatterns) {
    const parts = cleanContent.split(pattern).map(r => r.trim()).filter(r => r && r.length > 20);
    if (parts.length >= 3) {
      responses = parts.slice(0, 3).map(response => cleanupResponse(response));
      break;
    }
  }

  if (responses.length < 3) {
    responses = intelligentSplit(cleanContent);
  }

  while (responses.length < 3) {
    responses.push(generateFallbackResponse(responses.length + 1));
  }

  return responses.slice(0, 3).map((response, index) => validateAndEnhanceResponse(response, index + 1));
}

function cleanupResponse(response: string): string {
  return response
    .replace(/^[【\[].*?[】\]]\s*/, '')
    .replace(/^[1-3][\.、：:]\s*/, '')
    .replace(/^回复[1-3][：:]\s*/i, '')
    .replace(/^第[一二三1-3]个?[回答回复][：:]\s*/i, '')
    .trim();
}

function intelligentSplit(content: string): string[] {
  const sentences = content.split(/[。！？]/).filter(s => s.trim());

  if (sentences.length < 6) {
    const avgLength = Math.floor(content.length / 3);
    const responses: string[] = [];

    for (let i = 0; i < 3; i++) {
      const start = i * avgLength;
      const end = i === 2 ? content.length : (i + 1) * avgLength;
      let segment = content.substring(start, end).trim();

      if (i < 2) {
        const lastSentenceEnd = segment.lastIndexOf('。');
        if (lastSentenceEnd > segment.length * 0.7) {
          segment = segment.substring(0, lastSentenceEnd + 1);
        }
      }

      responses.push(segment);
    }

    return responses.filter(r => r.length > 20);
  }

  const sentencesPerResponse = Math.ceil(sentences.length / 3);
  const responses: string[] = [];

  for (let i = 0; i < 3; i++) {
    const start = i * sentencesPerResponse;
    const end = Math.min((i + 1) * sentencesPerResponse, sentences.length);
    const responseText = sentences.slice(start, end).join('。') + '。';
    responses.push(responseText);
  }

  return responses.filter(r => r.length > 20);
}

function generateFallbackResponse(index: number): string {
  const fallbacks = [
    "根据您提供的情况，我建议我们从实际业务需求出发，在确保合规的前提下，寻找既能满足业务发展又能符合监管要求的解决方案。我们可以一起讨论具体的实施路径。",
    "从专业角度来看，这个问题确实需要重视。建议您先梳理现有的做法，识别可能存在的风险点，然后制定针对性的改进措施。我们可以提供专业指导，确保整改工作的有效性。",
    "基于审计经验，类似情况在其他企业也有遇到。关键是要建立系统性的解决思路：首先明确问题根源，然后制定分阶段的整改计划，最后建立长效机制防止问题再次发生。"
  ];

  return fallbacks[index - 1] || fallbacks[0];
}

function validateAndEnhanceResponse(response: string, index: number): string {
  if (response.length < 30) {
    return generateFallbackResponse(index);
  }

  if (!response.match(/[。！？]$/)) {
    response += '。';
  }

  const sentences = response.split(/[。！？]/).filter(s => s.trim());
  const uniqueSentences = Array.from(new Set(sentences));

  if (uniqueSentences.length !== sentences.length) {
    response = uniqueSentences.join('。') + '。';
  }

  return response;
}
