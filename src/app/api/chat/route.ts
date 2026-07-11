import { NextRequest, NextResponse } from 'next/server';

// Coze API 配置 - 从环境变量读取
const COZE_API_BASE = process.env.COZE_API_BASE_URL || 'https://api.coze.cn';
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || '';

// 流式输出标志
export const runtime = 'edge';
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
      userId,                     // 用户标识（模式B/C需要）
      metaData                    // 患者元数据（模式B/C需要）
    } = body;

    // 获取API Token
    const apiToken = process.env.COZE_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: 'COZE_API_TOKEN not configured' },
        { status: 500 }
      );
    }

    // 默认Bot ID
    const targetBotId = botId || process.env.COZE_BOT_ID || '1118647974625609';

    // 根据模式确定参数
    let finalConversationId: string | undefined;
    let finalAutoSaveHistory: boolean;
    let finalUserId: string;

    switch (mode) {
      case 'instant':
        // 模式A：即时问答（无上下文）
        // 不传 conversation_id，系统自动生成临时会话
        finalConversationId = undefined;
        finalAutoSaveHistory = false;
        finalUserId = 'anonymous';
        break;
      
      case 'patient':
        // 模式B：患者随访（有上下文）
        // 必须传 conversation_id 和 userId
        finalConversationId = conversationId || undefined;
        finalAutoSaveHistory = autoSaveHistory ?? true;
        finalUserId = userId || `patient-${Date.now()}`;
        break;
      
      case 'multi-patient':
        // 模式C：多患者并行管理
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

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      bot_id: targetBotId,
      user_id: finalUserId,
      stream: true,
      auto_save_history: finalAutoSaveHistory,
      additional_messages: [
        {
          role: 'user',
          content: message,
          content_type: 'text',
        },
      ],
    };

    // 仅在模式B/C时传入 conversation_id
    if (finalConversationId) {
      requestBody.conversation_id = finalConversationId;
    }

    // 仅在模式B/C时传入 meta_data
    if (metaData && (mode === 'patient' || mode === 'multi-patient')) {
      requestBody.meta_data = metaData;
    }

    // 构建Coze API请求 - 使用 v3/chat 端点
    const cozeResponse = await fetch(`${COZE_API_BASE}/v3/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!cozeResponse.ok) {
      const error = await cozeResponse.text();
      return NextResponse.json(
        { error: `Coze API error: ${error}` },
        { status: cozeResponse.status }
      );
    }

    // 检查响应类型 - 如果不是流式响应，可能是错误响应
    const contentType = cozeResponse.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      // 非流式响应，可能是错误 JSON
      const responseBody = await cozeResponse.text();
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
    const transformStream = new TransformStream({
      async start(controller) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 转发数据块到客户端
            controller.enqueue(value);

            // 解析 SSE 事件，提取 conversation_id
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.slice(5).trim());
                  if (data.conversation_id && !extractedConversationId) {
                    extractedConversationId = data.conversation_id;
                    // 通过自定义 SSE 事件发送给客户端
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: 'conversation_id', conversation_id: extractedConversationId })}\n\n`
                      )
                    );
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
          controller.terminate();
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

// 获取会话列表
export async function GET(request: NextRequest) {
  try {
    const apiToken = process.env.COZE_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: 'COZE_API_TOKEN not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
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
