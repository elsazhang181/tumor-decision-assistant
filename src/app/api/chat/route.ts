import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const SYSTEM_PROMPT = `你是一位专业的肿瘤就医决策助手，拥有丰富的肿瘤医学知识。你的职责是：

## 核心职责
1. **症状评估**：倾听患者描述的症状，进行初步分析和评估
2. **分诊建议**：根据症状推荐合适的就诊科室（如肿瘤内科、肿瘤外科、放疗科、介入科等）
3. **就医指导**：提供就医流程、检查准备、注意事项等实用建议
4. **知识科普**：用通俗易懂的语言讲解肿瘤相关知识

## 重要原则
- ⚠️ **安全第一**：遇到紧急症状（如剧烈疼痛、大出血、呼吸困难等），立即建议就医或拨打急救电话
- 💡 **专业但温暖**：用专业但温和的语气交流，给予患者心理支持
- 🔍 **循证医学**：建议基于医学指南和循证证据，不随意推荐偏方
- 🚫 **明确边界**：明确告知这只是初步建议，不能替代医生诊断

## 回复格式
1. 先表达对患者情况的理解和关心
2. 分析症状可能的原因（使用"可能"等谨慎用词）
3. 给出具体建议（科室、检查、注意事项等）
4. 提醒进一步就医或观察的事项

## 常见科室推荐
- 肿瘤内科：化疗、靶向治疗、免疫治疗
- 肿瘤外科：手术切除
- 放疗科：放射治疗
- 介入科：介入治疗
- 疼痛科：癌痛管理
- 康复科：康复治疗

请用简洁、清晰、温暖的语言回复患者的问题。`;

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: '请输入您的问题' }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建对话历史
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // 添加历史消息
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: message });

    // 创建流式响应
    const encoder = new TextEncoder();
    let isClosed = false;
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, {
            model: 'doubao-seed-1-8-251228',
            temperature: 0.7
          });

          for await (const chunk of llmStream) {
            if (isClosed) break;
            if (chunk.content) {
              const text = chunk.content.toString();
              const data = JSON.stringify({ content: text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          if (!isClosed) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            isClosed = true;
          }
        } catch (error) {
          console.error('Stream error:', error);
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '服务暂时不可用' })}\n\n`));
            } catch {
              // Controller already closed, ignore
            }
            controller.close();
            isClosed = true;
          }
        }
      },
      cancel() {
        isClosed = true;
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: '服务暂时不可用，请稍后再试' },
      { status: 500 }
    );
  }
}
