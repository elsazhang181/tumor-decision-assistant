import { NextRequest, NextResponse } from 'next/server';

// Coze API 配置 - 按优先级从环境变量读取，否则使用内置默认值。
// 说明：Coze 部署平台禁止生产环境变量使用 COZE_ 前缀，
// 因此兼容多种命名：MEDAI_*（推荐）/ 裸名 API_TOKEN 等（平台配置）/ COZE_*（本地 .env）。
// 规范化：Bot ID 必须是纯数字（Coze Bot ID 为 19 位），异常则回退默认值
const RAW_BOT_ID = process.env.MEDAI_BOT_ID || process.env.BOT_ID || process.env.COZE_BOT_ID || '';
const COZE_BOT_ID = /^\d{10,}$/.test(RAW_BOT_ID.trim()) ? RAW_BOT_ID.trim() : '7633265670037323818';

// 规范化：Base URL 必须是 coze.cn/coze.com 官方域名，异常则回退默认值
const RAW_BASE_URL = (process.env.MEDAI_API_BASE_URL || process.env.API_BASE_URL || process.env.COZE_API_BASE_URL || '').trim();
const COZE_API_BASE = /^https:\/\/api\.coze\.(cn|com)/.test(RAW_BASE_URL) ? RAW_BASE_URL.replace(/\/+$/, '') : 'https://api.coze.cn';

// 令牌：任意可用前缀的变量，去除空白
const COZE_API_TOKEN = (process.env.MEDAI_API_TOKEN || process.env.API_TOKEN || process.env.COZE_API_TOKEN || '').trim();

// 使用 Node.js 运行时以确保外部 API 调用兼容性
export const runtime = 'nodejs';
export const maxDuration = 120;

// 判断 Coze 最终 answer 是否为「有效回答」。
// 无效即触发自动重试，避免把工具报错或敷衍兜底暴露给用户。
function isAnswerValid(answerText: string, rawSse: string): boolean {
  const a = (answerText || '').trim();

  // 1) 空答案
  if (a.length < 2) return false;

  // 2) 插件/工具失败直接泄漏
  if (/gen fail|rpc\s*error|ocean\.cloud\.plugin|doaction/i.test(a)) return false;

  // 3) 原始流中出现工具调用失败事件
  if (/gen fail|ocean\.cloud\.plugin/i.test(rawSse || '')) return false;

  // 4) 敷衍兜底式回答（未真正按人设作答）
  const evasivePatterns = [
    /暂未?找到.{0,12}(权威|相关).{0,6}信息/,
    /(抱歉|对不起)?(，|,)?\s*(我)?(知识库|资料|数据库)?(中|里)?\s*(没有|未|暂无).{0,20}(相关|对应)?(信息|内容|资料|数据|答案)/,
    /^(抱歉|对不起)[，,。\s]*.{0,30}(无法|未能|不能).{0,20}(回答|解答|提供)/,
    /无法(为您|为你)?(提供|给出).{0,20}(答案|回答|信息)/,
  ];
  for (const re of evasivePatterns) {
    if (re.test(a)) return false;
  }

  return true;
}

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

    // 直接使用用户消息，不添加额外要求（后台提示词已包含完整规则）
    const finalMessage = message;

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

    // 即时问答模式使用适中的 temperature（0.7）
    // 说明：实测 temperature=0 的极端确定性与 Coze 长回复生成偶发被中断（gen fail）相关，
    // 0.7 能兼顾回答一致性并显著降低生成中断概率
    if (mode === 'instant') {
      requestBody.temperature = 0.7;
    }

    // 仅在模式 B/C 时传入 conversation_id
    if (finalConversationId) {
      requestBody.conversation_id = finalConversationId;
    }

    // 仅在模式 B/C 时传入 meta_data
    if (metaData && (mode === 'patient' || mode === 'multi-patient')) {
      requestBody.meta_data = metaData;
    }

    // ============ 带自动重试的 Coze 流式调用 ============
    // 背景：Bot 后台「联网问答(免费版)」插件间歇性失败（gen fail / RPCError / 敷衍兜底）。
    // 策略：先完整拉取一次 SSE 响应，解析最终 answer；若答案无效则自动重试（最多 3 次），
    // 拿到有效结果后再以 SSE 流式回放给前端，前端仍呈现打字机效果。
    const MAX_ATTEMPTS = 3;
    const RETRY_BACKOFF = [0, 800, 1600];

    // 调用一次 Coze 并把完整 SSE 文本收集回来，同时解析出最终答案内容
    const callCozeOnce = async (attempt: number): Promise<{ ok: boolean; sseText: string; answerText: string; conversationId: string; status?: number; errText?: string }> => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 45000);
      try {
        // 重试时使用不同的 user_id 后缀，避免复用坏会话
        const retryBody = { ...requestBody };
        if (attempt > 0) retryBody.user_id = `${finalUserId}-r${attempt}-${Date.now()}`;
        const resp = await fetch(`${COZE_API_BASE}/v3/chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryBody),
          signal: ctrl.signal,
        });

        if (!resp.ok) {
          const errText = await resp.text();
          console.error(`Coze API error response (attempt ${attempt}):`, resp.status, errText);
          return { ok: false, sseText: '', answerText: '', conversationId: '', status: resp.status, errText };
        }

        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('text/event-stream')) {
          const errText = await resp.text();
          console.error(`Coze non-stream response (attempt ${attempt}):`, errText);
          // 非流式但可能是业务错误，允许重试
          return { ok: false, sseText: '', answerText: '', conversationId: '', status: resp.status, errText };
        }

        const raw = await resp.text();

        // 解析 conversation_id 与最终 answer
        let conversationId = '';
        let answerText = '';
        for (const line of raw.split('\n')) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload);
            if (obj.conversation_id && !conversationId) conversationId = obj.conversation_id;
            // answer 类型消息：最终给用户看的答案
            if (obj.type === 'answer' && typeof obj.content === 'string') {
              answerText += obj.content;
            }
          } catch {
            // 忽略不完整 JSON
          }
        }

        const valid = isAnswerValid(answerText, raw);
        if (!valid) {
          console.warn(`Coze answer invalid (attempt ${attempt}), will retry. answer="${answerText.slice(0, 80)}"`);
        }
        return { ok: valid, sseText: raw, answerText, conversationId };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.error(`Coze fetch error (attempt ${attempt}):`, msg);
        return { ok: false, sseText: '', answerText: '', conversationId: '', errText: msg };
      } finally {
        clearTimeout(timer);
      }
    };

    let result: Awaited<ReturnType<typeof callCozeOnce>> | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (RETRY_BACKOFF[attempt] > 0) {
        await new Promise(r => setTimeout(r, RETRY_BACKOFF[attempt]));
      }
      result = await callCozeOnce(attempt);
      if (result.ok) break;
    }

    // 所有重试都失败
    if (!result || !result.ok) {
      console.error('Coze 全部重试失败:', result?.errText || 'unknown');
      return NextResponse.json(
        { error: '生成服务暂时繁忙，请稍后点击「重新生成」再试一次。' },
        { status: 503 }
      );
    }

    // 移除回答中的图片/附件引用，仅保留纯文本与文本URL。
// 兜底：即使提示词未同步到后端，线上也不会向用户输出图片。
function stripImageRefs(input: string): string {
  const lines = (input || '').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    // 整行就是图片/附件引用 → 直接丢弃该行
    if (
      /^!\[.*\]\(.*\)$/.test(t) ||          // ![alt](url)
      /^\[Image\]\(.*\)$/i.test(t) ||        // [Image](url)
      /^https?:\/\/\S*\/assets\//i.test(t) ||// 裸 assets URL
      /^https?:\/\/\S*\/api\/sandbox/i.test(t)
    ) {
      continue;
    }
    // 行内混有图片语法 → 仅移除图片片段，保留正文
    const inline = t
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[Image\]\([^)]*\)/gi, '');
    out.push(inline.trim());
  }
  // 合并连续空行
  const joined = out.filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n');
  return joined;
}

// 将有效的完整 SSE 文本流式回放给前端（保持打字机效果）
    const sseText = result.sseText;
    const convId = result.conversationId;
    const encoder = new TextEncoder();
    const replayStream = new ReadableStream({
      start(controller) {
        try {
          // 先注入 conversation_id（B/C 模式需要）
          if (convId) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'conversation_id', conversation_id: convId })}\n\n`));
          }
          // 按 SSE 事件块切分回放，块间轻微间隔，前端能逐段渲染
          const rawChunks = sseText.split(/\n\n+/).filter(c => c.trim().length > 0);
          // 每块仅对 answer 文本做图片过滤，其余事件（conversation_id 等）原样保留
          const chunks = rawChunks.map((c) => {
            const m = c.match(/^data:\s*([\s\S]*)$/);
            if (m) {
              try {
                const obj = JSON.parse(m[1].trim());
                if (obj && typeof obj.content === 'string' && obj.type === 'answer') {
                  const cleaned = stripImageRefs(obj.content);
                  return `data: ${JSON.stringify({ ...obj, content: cleaned })}\n\n`;
                }
              } catch { /* 非 JSON 事件原样保留 */ }
            }
            return c + '\n\n';
          });
          let i = 0;
          const pump = () => {
            if (i >= chunks.length) {
              controller.close();
              return;
            }
            try {
              controller.enqueue(encoder.encode(chunks[i] + '\n\n'));
            } catch {
              try { controller.close(); } catch { /* ignore */ }
              return;
            }
            i++;
            // 用微任务/短延时回放，避免一次性塞入，保留流式观感
            setTimeout(pump, 8);
          };
          pump();
        } catch (err) {
          console.error('Replay stream error:', err);
          try { controller.close(); } catch { /* ignore */ }
        }
      },
    });

    return new Response(replayStream, {
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
    
    const apiToken = COZE_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: 'MEDAI_API_TOKEN/COZE_API_TOKEN not configured' },
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
