import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request } from "node:https";
import { z } from "zod";

export type DnsAddress = { address: string; family: number };
type Resolve = (hostname: string) => Promise<DnsAddress[]>;
const synthetic = new BlockList();
synthetic.addSubnet("198.18.0.0", 15, "ipv4");
const answerSchema = z.object({
  Status: z.literal(0),
  Answer: z
    .array(
      z.object({
        type: z.number(),
        data: z.string(),
        TTL: z.number().nonnegative(),
      }),
    )
    .max(64)
    .default([]),
});
const cache = new Map<string, { addresses: DnsAddress[]; expires: number }>();

async function queryResolver(hostname: string, endpoint: string) {
  // Both endpoints are fixed trusted resolvers. Never accept a resolver URL from a visitor.
  const url = new URL(endpoint);
  url.search = new URLSearchParams({ name: hostname, type: "A" }).toString();
  const payload = await new Promise<unknown>((resolve, reject) => {
    const query = request(
      url,
      {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(2500),
        agent: false,
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.destroy();
          reject(new Error("DNS_HTTPS_FAILED"));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 64 * 1024) {
            response.destroy(new Error("DNS_RESPONSE_LIMIT"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            reject(new Error("DNS_INVALID_RESPONSE"));
          }
        });
        response.on("error", reject);
      },
    );
    query.on("error", reject);
    query.end();
  });
  const result = answerSchema.parse(payload);
  const records = result.Answer.filter((record) => record.type === 1);
  if (!records.length) throw new Error("DNS_NO_ADDRESS");
  if (records.some((record) => isIP(record.data) !== 4))
    throw new Error("DNS_INVALID_ADDRESS");
  return records;
}

async function resolveHttps(hostname: string): Promise<DnsAddress[]> {
  const existing = cache.get(hostname);
  if (existing && existing.expires > Date.now()) return existing.addresses;
  // The nearest working resolver avoids long cross-region DNS round trips in Fake-IP environments.
  // Only the hostname is sent; the link's path, query and fragment never leave through DNS.
  const records = await queryResolver(
    hostname,
    "https://dns.alidns.com/resolve",
  ).catch(() =>
    queryResolver(hostname, "https://cloudflare-dns.com/dns-query"),
  );
  const addresses = records.map((record) => ({
    address: record.data,
    family: 4,
  }));
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  cache.set(hostname, {
    addresses,
    expires:
      Date.now() + Math.min(60, ...records.map((record) => record.TTL)) * 1000,
  });
  return addresses;
}

/** Only all-synthetic proxy answers trigger HTTPS DNS; other private/mixed answers stay blocked. */
export async function resolveWebAddresses(
  hostname: string,
  system: Resolve = (name) => lookup(name, { all: true, verbatim: true }),
  https: Resolve = resolveHttps,
): Promise<DnsAddress[]> {
  const addresses = await system(hostname);
  if (
    addresses.length &&
    addresses.every(
      (item) => item.family === 4 && synthetic.check(item.address, "ipv4"),
    )
  )
    return https(hostname);
  return addresses;
}
