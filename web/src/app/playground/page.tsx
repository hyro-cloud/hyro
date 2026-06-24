import type { Metadata } from 'next';
import { PlaygroundApp } from '@/components/playground/playground-shell';
import { pageMetadata } from '@/lib/site-metadata';

const title = 'Playground — HYRO Agent Studio';
const description =
  'HYRO Playground: chat with MiMo, Claude, GPT and more. Memory, goals, MCP tools, and Base/B20 crypto utilities — local demo, no API key required.';

export const metadata: Metadata = pageMetadata({ title, description, path: '/playground' });

export default function PlaygroundPage() {
  return <PlaygroundApp />;
}
