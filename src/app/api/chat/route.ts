import { NextRequest, NextResponse } from 'next/server';

// Coze API 配置 - 从环境变量读取
const COZE_API_BASE = process.env.COZE_API_BASE_URL || 'https://api.coze.cn';
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || '';

// 流式输出标志
export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId, botId } = body;

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

    // 构建Coze API请求
    const cozeResponse = await fetch(`${COZE_API_BASE}/v3/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: targetBotId,
        user_id: 'vercel-user',
        conversation_id: conversationId || undefined,
        query: message,
        stream: true,
      }),
    });

    if (!cozeResponse.ok) {
      const error = await cozeResponse.text();
      return NextResponse.json(
        { error: `Coze API error: ${error}` },
        { status: cozeResponse.status }
      );
    }

    // 返回流式响应
    return new Response(cozeResponse.body, {
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
