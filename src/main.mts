import type { ContractTag, ITagService } from "atq-types";
import fetch from "node-fetch";

// Messari published deployment list: https://github.com/messari/subgraphs/blob/master/deployment/deployment.json
// Suzaku Avalanche subgraph ChnR9QwW6tzKt2hbuHLmHqeB1Sk35UzR1XDbxYBA3cvW.
const deployment = "QmYWxWtCAhUiNMAd6GQYXi7V2W2FGaWZrZufQEcTnMMYpP";
const endpoint = `https://gateway.thegraph.com/api/deployments/id/${deployment}`;
// Bind the protocol identity from the selected published Suzaku source.
const provider = "0xe5296638aa86bd4175d802a210e158688e41a93c";
type Token = { id: string };
type Pool = { id: string; inputTokens: Token[]; protocol: { id: string } };
type Meta = { deployment: string; hasIndexingErrors: boolean; block: { number: number; hash: string | null } };
function address(value: string): string {
  if (typeof value !== "string" || !/^0x[0-9a-f]{40}$/i.test(value) || /^0x0{40}$/i.test(value)) throw new Error("Invalid token or provider address");
  return value.toLowerCase();
}
function meta(value: unknown, initial?: Meta): Meta {
  const m = value as Meta;
  if (!m || m.deployment !== deployment || m.hasIndexingErrors !== false || !Number.isSafeInteger(m.block?.number) || m.block.number < 1 ||
      (m.block.hash !== null && !/^0x[0-9a-f]{64}$/i.test(m.block.hash)) || !initial && !m.block.hash ||
      initial && (m.block.number !== initial.block.number || m.block.hash !== null && m.block.hash !== initial.block.hash)) throw new Error("Unknown or inconsistent source block");
  return m;
}
async function query(text: string, apiKey: string): Promise<Record<string, unknown>> {
  const c = new AbortController(), timer = setTimeout(() => c.abort(), 30000);
  try {
    const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ query: text }), signal: c.signal });
    if (!r.ok) throw new Error("Graph request failed");
    const d = await r.json() as { data?: Record<string, unknown>; errors?: unknown[] };
    if (!d.data || d.errors?.length) throw new Error("Incomplete source response");
    return d.data;
  } finally { clearTimeout(timer); }
}
const service: ITagService = {
  async returnTags(chainId: string, apiKey: string | null): Promise<ContractTag[]> {
    if (chainId !== "43114") throw new Error(`Unsupported Chain ID: ${chainId}`);
    if (typeof apiKey !== "string" || !apiKey.trim()) throw new Error("A Graph API key is required");
    const initial = meta((await query("{ _meta { deployment hasIndexingErrors block { number hash } } }", apiKey))._meta);
    const atBlock = `block: { hash: ${JSON.stringify(initial.block.hash)} }`;
    const tags: ContractTag[] = [], seen = new Set<string>(), labels = new Set<string>();
    // Address-valued Bytes IDs have no unique sequential field. Use an ID cursor.
    let cursor = "0x";
    for (;;) {
      const d = await query(`{ _meta(${atBlock}) { deployment hasIndexingErrors block { number hash } }
        pools(first: 1000, orderBy: id, orderDirection: asc, where: { id_gt: ${JSON.stringify(cursor)} }, ${atBlock}) { id protocol { id } inputTokens { id } } }`, apiKey);
      meta(d._meta, initial);
      const rows = d.pools;
      if (!Array.isArray(rows) || rows.length > 1000) throw new Error("Invalid source page");
      for (const market of rows as Pool[]) {
        if (typeof market.id !== "string" || market.id <= cursor) throw new Error("Cursor did not advance");
        cursor = market.id;
        if (address(market.protocol?.id) !== provider) throw new Error("Unexpected protocol provider");
        // The published mapping creates Pool from the Collateral Deposit/Withdraw
        // event emitter (event.address). Pool.name/symbol describe its asset,
        // not this wrapper token. Neither that asset nor a null outputToken is tagged.
        const contract = address(market.id);
        if (!Array.isArray(market.inputTokens) || market.inputTokens.length !== 1) throw new Error("Unknown collateral asset role");
        const asset = address(market.inputTokens[0].id);
        if (asset === contract || seen.has(contract)) throw new Error("Underlying asset or repeated collateral contract");
        seen.add(contract);
        const label = `Default Collateral Token (${contract.slice(2, 12)})`;
        if (labels.has(label)) throw new Error("Ambiguous tag label");
        labels.add(label);
        tags.push({ "Contract Address": `eip155:43114:${contract}`, "Public Name Tag": label, "Project Name": "Suzaku", "UI/Website Link": "https://suzaku.network", "Public Note": `Legacy Default Collateral ERC-20 wrapper token on Avalanche. Indexed underlying asset: ${asset}. Suzaku's collateral implementation derives from Symbiotic. Includes historical contracts; no claim of current restaking, backing or operator identity.` });
      }
      if (rows.length < 1000) break;
    }
    return tags;
  },
};
export async function returnTags(chainId: string, apiKey: string): Promise<ContractTag[]> {
  return service.returnTags(chainId, apiKey);
}
