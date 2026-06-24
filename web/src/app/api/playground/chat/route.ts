import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ChatBody {
  messages: { role: string; content: string }[];
  modelId?: string;
}

function resolveMimoModel(modelId?: string): string {
  if (modelId?.startsWith('mimo')) {
    return process.env.MIMO_API_MODEL?.trim() || 'mimo-v2.5-pro';
  }
  return process.env.MIMO_API_MODEL?.trim() || 'mimo-v2.5-pro';
}

function isMimoModel(modelId?: string): boolean {
  return !modelId || modelId.startsWith('mimo');
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;
  const { messages, modelId } = body;

  if (!messages?.length) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  if (!isMimoModel(modelId)) {
    return NextResponse.json(
      {
        error:
          'Playground live chat uses MiMo on HYRO VPS. Select Mimo 2.5 Pro or configure provider keys on api.hyrocloud.lol.',
      },
      { status: 503 },
    );
  }

  const apiKey = process.env.MIMO_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'MIMO_API_KEY not configured. Add it to web .env.local or Vercel env.' },
      { status: 503 },
    );
  }

  const baseUrl = process.env.XIAOMI_BASE_URL?.trim() || 'https://token-plan-sgp.xiaomimimo.com/v1';
  const model = resolveMimoModel(modelId);

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return NextResponse.json(
      { error: `MiMo API ${upstream.status}: ${errText.slice(0, 200)}` },
      { status: 502 },
    );
  }

  if (!upstream.body) {
    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ content });
  }

  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') continue;
            try {
              const json = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
              }
            } catch {
              /* skip */
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
