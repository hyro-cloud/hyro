import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface GenBody {
  description: string;
  kind?: 'skill' | 'memory';
}

const SYSTEM = `You are HYRO, generating a paid API "skill" for Bankr x402 Cloud.
Return STRICT JSON only (no markdown, no prose) with exactly these keys:
{ "title": string, "summary": string, "category": string, "price": string, "tags": string[], "code": string }
- "price" is USD as a string, e.g. "0.01".
- "code" is a COMPLETE TypeScript Bankr x402 handler:
  export default async function handler(req: Request) { ... }
  It must return a JSON-serializable object. No x402 imports, no payment/blockchain code.
  Read inputs from the URL query string. Use process.env for any API keys.
  For a memory pack, return { items: [{ type, content }, ...] }.
Keep it minimal but working.`;

function titleFrom(desc: string): string {
  const words = desc.trim().split(/\s+/).slice(0, 5).join(' ');
  return words.replace(/^\w/, (c) => c.toUpperCase()).slice(0, 60) || 'New Skill';
}

function template(description: string, kind: 'skill' | 'memory') {
  const code =
    kind === 'memory'
      ? `export default async function handler() {
  // Curated memory pack — buyers import these into HYRO with: hyro memory import <slug>.jsonl
  return {
    items: [
      { type: "fact", content: "TODO: ${description.replace(/"/g, "'").slice(0, 80)}" },
      { type: "policy", content: "TODO: add a guardrail policy" },
    ],
  };
}`
      : `export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input") ?? "";
  // TODO: implement "${description.replace(/"/g, "'").slice(0, 80)}"
  // Use process.env.YOUR_KEY for secrets (set via: bankr x402 env set)
  return { ok: true, input, result: "replace with your logic", ts: Date.now() };
}`;
  return {
    title: titleFrom(description),
    summary: description.trim().slice(0, 160),
    category: kind === 'memory' ? 'memory' : 'skill',
    price: '0.01',
    tags: description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3),
    code,
  };
}

function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.replace(/```(?:json)?/gi, '').trim();
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { description, kind = 'skill' } = (await req.json()) as GenBody;
  if (!description?.trim()) {
    return NextResponse.json({ error: 'description required' }, { status: 400 });
  }

  const apiKey = process.env.MIMO_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ ...template(description, kind), model: 'template' });
  }

  const baseUrl = process.env.XIAOMI_BASE_URL?.trim() || 'https://token-plan-sgp.xiaomimimo.com/v1';
  const model = process.env.MIMO_API_MODEL?.trim() || 'mimo-v2.5-pro';
  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Kind: ${kind}\nDescription: ${description}` },
        ],
        temperature: 0.4,
        max_completion_tokens: 1600,
      }),
    });
    if (!upstream.ok) return NextResponse.json({ ...template(description, kind), model: 'template' });
    const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
    const json = extractJson(data.choices?.[0]?.message?.content ?? '');
    if (!json?.code) return NextResponse.json({ ...template(description, kind), model: 'template' });
    return NextResponse.json({
      title: String(json.title ?? titleFrom(description)),
      summary: String(json.summary ?? description).slice(0, 200),
      category: String(json.category ?? (kind === 'memory' ? 'memory' : 'skill')),
      price: String(json.price ?? '0.01'),
      tags: Array.isArray(json.tags) ? (json.tags as unknown[]).map(String).slice(0, 6) : [],
      code: String(json.code),
      model,
    });
  } catch {
    return NextResponse.json({ ...template(description, kind), model: 'template' });
  }
}
