import { NextRequest, NextResponse } from 'next/server';

// Coze API 配置 - 优先从环境变量读取，否则使用默认值
const COZE_API_BASE = process.env.COZE_API_BASE_URL || 'https://api.coze.cn';
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || process.env.COZE_API_TOKEN || "";
const COZE_BOT_ID = process.env.COZE_BOT_ID || '7633265670037323818';

// 使用 Node.js 运行时以确保外部 API 调用兼容性
export const runtime = 'nodejs';
export const maxDuration = 60;

// 对话模式类型
type ChatMode = 'instant' | 'patient' | 'multi-patient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      message, 
      conversationId, 
      botId,
      mode = 'instant',           // 'instant' | 'patient' | 'multi-patient'
      autoSaveHistory,            // 是否保存历史（默认根据模式决定）
      userId,                     // 用户标识（模式 B/C 需要）
      metaData                    // 患者元数据（模式 B/C 需要）
    } = body;

    // 使用顶部定义的 COZE_API_TOKEN（已包含默认值回退）
    const apiToken = COZE_API_TOKEN;

    // 默认 Bot ID
    const targetBotId = botId || COZE_BOT_ID;

    // 根据模式确定参数
    let finalConversationId: string | undefined;
    let finalAutoSaveHistory: boolean;
    let finalUserId: string;

    switch (mode) {
      case 'instant':
        // 模式 A：即时问答（无上下文）
        // 不传 conversation_id，系统自动生成临时会话
        finalConversationId = undefined;
        finalAutoSaveHistory = false;
        finalUserId = 'anonymous';
        break;
      
      case 'patient':
        // 模式 B：患者随访（有上下文）
        // 必须传 conversation_id 和 userId
        finalConversationId = conversationId || undefined;
        finalAutoSaveHistory = autoSaveHistory ?? true;
        finalUserId = userId || `patient-${Date.now()}`;
        break;
      
      case 'multi-patient':
        // 模式 C：多患者并行管理
        // 必须传 conversation_id 和 userId
        finalConversationId = conversationId || undefined;
        finalAutoSaveHistory = autoSaveHistory ?? true;
        finalUserId = userId || `doctor-${Date.now()}`;
        break;
      
      default:
        // 默认使用即时模式
        finalConversationId = undefined;
        finalAutoSaveHistory = false;
        finalUserId = 'anonymous';
    }

    // 为即时问答模式添加来源引用要求，确保结论有据可依且回答一致
    let finalMessage = message;
    if (mode === 'instant') {
      finalMessage = message + '\n\n【严格回答要求】\n1. 结论必须引用具体权威来源（如：国家医保局官网、国家卫健委文件、各省市医保局官网、医院官网公告、中华医学会指南、CSCO指南、NCCN指南、柳叶刀/NEJM等权威期刊、人民日报/新华社等官方媒体）。\n2. 必须给出明确的具体数字、比例、时间等关键信息，不要模糊表述。\n3. 如果无法从权威来源确认具体数据，必须明确说明"根据XX来源，目前暂无公开的具体数据"，并给出查询建议（如拨打12393医保热线、登录国家医保服务平台APP等）。\n4. 回答必须基于事实和权威来源，不要编造数据。';
    }

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      bot_id: targetBotId,
      user_id: finalUserId,
      stream: true,
      auto_save_history: finalAutoSaveHistory,
      additional_messages: [
        {
          role: 'user',
          content: finalMessage,
          content_type: 'text',
        },
      ],
    };

    // 即时问答模式设置 temperature=0 确保相同问题回答一致
    if (mode === 'instant') {
      requestBody.temperature = 0;
    }

    // 仅在模式 B/C 时传入 conversation_id
    if (finalConversationId) {
      requestBody.conversation_id = finalConversationId;
    }

    // 仅在模式 B/C 时传入 meta_data
    if (metaData && (mode === 'patient' || mode === 'multi-patient')) {
      requestBody.meta_data = metaData;
    }

    // 构建 Coze API 请求 - 使用 v3/chat 端点，添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 秒超时

    let cozeResponse;
    try {
      cozeResponse = await fetch(`${COZE_API_BASE}/v3/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      console.error('Coze API fetch error:', errorMsg);
      return NextResponse.json(
        { error: `无法连接 Coze API: ${errorMsg}` },
        { status: 503 }
      );
    }
    clearTimeout(timeoutId);

    if (!cozeResponse.ok) {
      const error = await cozeResponse.text();
      console.error('Coze API error response:', cozeResponse.status, error);
      return NextResponse.json(
        { error: `Coze API error: ${error}` },
        { status: cozeResponse.status }
      );
    }

    // 检查响应类型 - 如果不是流式响应，可能是错误响应
    const contentType = cozeResponse.headers.get('content-type') || '';
    console.log('Coze API response content-type:', contentType);
    if (!contentType.includes('text/event-stream')) {
      // 非流式响应，可能是错误 JSON
      const responseBody = await cozeResponse.text();
      console.error('Coze API non-stream response:', responseBody);
      try {
        const errorJson = JSON.parse(responseBody);
        if (errorJson.code && errorJson.code !== 0) {
          return NextResponse.json(
            { error: errorJson.msg || 'Coze API 返回错误', code: errorJson.code },
            { status: 400 }
          );
        }
      } catch {
        // 非 JSON 响应
      }
      return NextResponse.json(
        { error: '意外的响应格式' },
        { status: 500 }
      );
    }

    // 解析流式响应
    const reader = cozeResponse.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: 'Failed to get response stream' },
        { status: 500 }
      );
    }

    // 创建转换流：转发 Coze API 数据到客户端，同时提取 conversation_id
    let extractedConversationId = '';
    let isClosed = false;
    const transformStream = new TransformStream({
      async start(controller) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (isClosed) break;

            // 转发数据块到客户端
            try {
              controller.enqueue(value);
            } catch {
              isClosed = true;
              break;
            }

            // 解析 SSE 事件，提取 conversation_id
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.startsWith('data:') && !isClosed) {
                try {
                  const data = JSON.parse(line.slice(5).trim());
                  if (data.conversation_id && !extractedConversationId) {
                    extractedConversationId = data.conversation_id;
                    // 通过自定义 SSE 事件发送给客户端
                    try {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: 'conversation_id', conversation_id: extractedConversationId })}\n\n`
                        )
                      );
                    } catch {
                      isClosed = true;
                    }
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } catch (err) {
          console.error('Stream processing error:', err);
        } finally {
          if (!isClosed) {
            try {
              controller.terminate();
            } catch {
              // 忽略关闭错误
            }
          }
        }
      },
    });

    // 返回流式响应（立即返回，不阻塞等待流完成）
    return new Response(transformStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 测试 Coze API 连接
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const test = searchParams.get('test');
    
    if (test === 'connection') {
      // 测试两个 API 的连接
      const results = [];
      
      // 测试 coze.cn
      try {
        const cnResponse = await fetch('https://api.coze.cn/v3/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${COZE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bot_id: COZE_BOT_ID,
            user_id: 'test',
            stream: false,
            additional_messages: [{ role: 'user', content: 'test', content_type: 'text' }],
          }),
          signal: AbortSignal.timeout(10000),
        });
        const cnBody = await cnResponse.text();
        results.push({
          platform: 'coze.cn',
          status: cnResponse.status,
          ok: cnResponse.ok,
          body: cnBody.substring(0, 500),
        });
      } catch (e) {
        results.push({ platform: 'coze.cn', error: (e as Error).message });
      }
      
      // 测试 coze.com
      try {
        const comResponse = await fetch('https://api.coze.com/v3/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${COZE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bot_id: COZE_BOT_ID,
            user_id: 'test',
            stream: false,
            additional_messages: [{ role: 'user', content: 'test', content_type: 'text' }],
          }),
          signal: AbortSignal.timeout(10000),
        });
        const comBody = await comResponse.text();
        results.push({
          platform: 'coze.com',
          status: comResponse.status,
          ok: comResponse.ok,
          body: comBody.substring(0, 500),
        });
      } catch (e) {
        results.push({ platform: 'coze.com', error: (e as Error).message });
      }
      
      return NextResponse.json({
        baseUrl: COZE_API_BASE,
        botId: COZE_BOT_ID,
        tokenLength: COZE_API_TOKEN.length,
        results,
      });
    }
    
    const apiToken = process.env.COZE_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: 'COZE_API_TOKEN not configured' },
        { status: 500 }
      );
    }

    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const cozeResponse = await fetch(
      `${COZE_API_BASE}/v3/chat/retrieve?chat_code=${conversationId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    );

    return NextResponse.json(await cozeResponse.json());
  } catch (error) {
    console.error('Retrieve chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
