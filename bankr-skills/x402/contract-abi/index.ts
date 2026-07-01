// HYRO official skill · contract-abi · suggested price $0.003
// No npm deps. Set a key first:  bankr x402 env set BASESCAN_API_KEY <key>
export default async function handler(req: Request) {
  const address = new URL(req.url).searchParams.get('address');
  if (!address) {
    return new Response(JSON.stringify({ error: '?address= required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  const key = process.env.BASESCAN_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'server missing BASESCAN_API_KEY' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
  const res = await fetch(
    `https://api.basescan.org/api?module=contract&action=getabi&address=${address}&apikey=${key}`,
  );
  const data = (await res.json()) as { status?: string; result?: string };
  if (data.status !== '1' || !data.result) {
    return { tool: 'contract.abi', address, verified: false };
  }
  const abi = JSON.parse(data.result) as { type: string; name?: string }[];
  return {
    tool: 'contract.abi',
    address,
    verified: true,
    functions: abi.filter((x) => x.type === 'function').map((x) => x.name),
    events: abi.filter((x) => x.type === 'event').map((x) => x.name),
  };
}
