import "server-only";
import { BlockList, isIP } from "node:net";
import { safeWebUrl } from "@/shared/contracts/rich-text";
import { resolveWebAddresses } from "./public-dns";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(address, prefix, "ipv4");
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
blocked.addSubnet("3fff::", 20, "ipv6");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");

export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  return (
    family === 6 &&
    globalV6.check(address, "ipv6") &&
    !blocked.check(address, "ipv6")
  );
}

/** Validate every DNS answer, then pin the selected answer in the HTTP transport. */
export async function publicTarget(
  value: string,
  resolve: (
    hostname: string,
  ) => Promise<{ address: string; family: number }[]> = resolveWebAddresses,
) {
  const url = new URL(safeWebUrl.parse(value));
  if (url.port && url.port !== (url.protocol === "https:" ? "443" : "80"))
    throw new Error("Unsupported port");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (
    !isIP(hostname) &&
    (!hostname.includes(".") ||
      /(?:^|\.)(?:localhost|local|lan|internal|invalid|test)\.?$/i.test(
        hostname,
      ))
  )
    throw new Error("Not a public hostname");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await resolve(hostname);
  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicAddress(address))
  )
    throw new Error("Not a public address");
  return { url, address: addresses[0]!.address, family: addresses[0]!.family };
}
