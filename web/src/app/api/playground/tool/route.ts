import { NextResponse } from 'next/server';
import { executeBaseTool, executeDexscreenerTool } from '@/lib/playground/mcp-tools-server';

export const runtime = 'nodejs';

interface ToolBody {
  server: 'base' | 'dexscreener';
  tool: string;
  args?: Record<string, string>;
}

export async function POST(req: Request) {
  const body = (await req.json()) as ToolBody;
  const { server, tool, args = {} } = body;

  if (!server || !tool) {
    return NextResponse.json({ error: 'server and tool required' }, { status: 400 });
  }

  try {
    const result =
      server === 'base'
        ? await executeBaseTool(tool, args)
        : await executeDexscreenerTool(tool, args);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
