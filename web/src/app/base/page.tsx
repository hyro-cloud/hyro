import { redirect } from 'next/navigation';

/** Legacy /base URL → Base MCP quickstart */
export default function BaseRedirectPage() {
  redirect('/mcp');
}
