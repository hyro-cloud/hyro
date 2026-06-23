/**
 * VPS setup instructions for MCP sources that need env vars on the API host.
 */
export const VPS_MCP_SETUP: Record<string, { env: string[]; steps: string[] }> = {
  github: {
    env: ['GITHUB_TOKEN'],
    steps: [
      '1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained (or Classic with repo scope)',
      '2. VPS: nano ~/hyro/.env.prod → add GITHUB_TOKEN=ghp_...',
      '3. VPS: docker compose --env-file .env.prod -f docker-compose.api.yml up -d --force-recreate api',
      '4. PC: hyro → connect github',
    ],
  },
  base: {
    env: ['BASE_RPC_URL'],
    steps: [
      '1. VPS: nano ~/hyro/.env.prod',
      '2. Add BASE_RPC_URL=https://mainnet.base.org  (testnet: https://sepolia.base.org)',
      '3. Optional WALLET_PRIVATE_KEY=0x... for send_transaction (hot wallet only)',
      '4. VPS: docker compose --env-file .env.prod -f docker-compose.api.yml up -d --force-recreate api',
      '5. PC: hyro → connect base',
      '6. Agent can call b20_launch_guide for B20 token steps (docs.base.org/get-started/launch-b20-token)',
    ],
  },
};

export function printVpsSetup(key: string): string {
  const guide = VPS_MCP_SETUP[key];
  if (!guide) return `No VPS setup guide for: ${key}`;
  return ['', `Setup ${key} on VPS:`, ...guide.steps, '', `Required in .env.prod: ${guide.env.join(', ')}`, ''].join(
    '\n',
  );
}
