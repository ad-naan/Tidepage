import "server-only";
import { z } from "zod";
import { boundedBody } from "@/server/http/body";
import { readEventStream } from "@/shared/http/event-stream";
import { readTool } from "./agent";

const supportedVersions = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;
const rpcReply = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.number(),
  result: z.unknown().optional(),
  error: z.unknown().optional(),
});
const initialized = z.object({
  protocolVersion: z.enum(supportedVersions),
  capabilities: z.object({ tools: z.object({}) }),
});
const toolsPage = z.object({
  tools: z.array(
    z.object({
      name: z.string(),
      annotations: z
        .object({ readOnlyHint: z.boolean().optional() })
        .optional(),
    }),
  ),
  nextCursor: z.string().max(512).optional(),
});
const callResult = z.object({
  isError: z.boolean().optional(),
  content: z
    .array(z.object({ type: z.string(), text: z.string().optional() }))
    .default([]),
});

export function mcpReferenceTool(binding: {
  endpoint: string;
  token?: string;
  remoteName: string;
  arguments: Record<string, string>;
  label: string;
}) {
  return readTool(
    "publication_reference",
    "Read optional external editorial guidance. This tool receives only server-selected public settings.",
    z.object({}).strict(),
    async (_, signal) => {
      try {
        const value = await readMcpText(binding, signal);
        return { source: { facts: [{ label: binding.label, value }] } };
      } catch {
        signal.throwIfAborted();
        return {
          error: "The optional external editorial reference is unavailable.",
        };
      }
    },
  );
}

async function readMcpText(
  binding: {
    endpoint: string;
    token?: string;
    remoteName: string;
    arguments: Record<string, string>;
  },
  signal: AbortSignal,
) {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(8000)]);
  let version: (typeof supportedVersions)[number] | undefined;
  let session: string | null = null;
  let sequence = 0;
  const headers = () => ({
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    ...(binding.token && { Authorization: `Bearer ${binding.token}` }),
    ...(session && { "MCP-Session-Id": session }),
    ...(version && { "MCP-Protocol-Version": version }),
  });
  async function post(method: string, params: object, notification = false) {
    const id = notification ? undefined : ++sequence;
    const response = await fetch(binding.endpoint, {
      method: "POST",
      headers: headers(),
      signal: deadline,
      redirect: "error",
      cache: "no-store",
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    if (method === "initialize" && response.ok)
      session = response.headers.get("MCP-Session-Id");
    if (!response.ok || notification) {
      await response.body?.cancel();
      if (!response.ok) throw new Error("MCP request failed");
      return undefined;
    }
    if (
      response.headers.get("Content-Type")?.includes("text/event-stream") &&
      response.body
    ) {
      let length = 0;
      for await (const data of readEventStream(response.body, deadline)) {
        length += data.length;
        if (length > 96_000) throw new Error("MCP response too large");
        const reply = rpcReply.safeParse(JSON.parse(data));
        if (reply.success && reply.data.id === id) {
          if (reply.data.error) throw new Error("MCP tool failed");
          return reply.data.result;
        }
      }
      throw new Error("MCP response incomplete");
    }
    const bytes = await boundedBody(response, 96 * 1024);
    const reply = rpcReply.parse(JSON.parse(new TextDecoder().decode(bytes)));
    if (reply.id !== id || reply.error) throw new Error("MCP tool failed");
    return reply.result;
  }
  try {
    const handshake = initialized.parse(
      await post("initialize", {
        protocolVersion: supportedVersions[0],
        capabilities: {},
        clientInfo: { name: "tidepage", version: "1.0.0" },
      }),
    );
    version = handshake.protocolVersion;
    await post("notifications/initialized", {}, true);
    let cursor: string | undefined;
    for (let page = 0; page < 3; page++) {
      const result = toolsPage.parse(
        await post("tools/list", cursor ? { cursor } : {}),
      );
      const tool = result.tools.find(({ name }) => name === binding.remoteName);
      if (tool) {
        if (tool.annotations?.readOnlyHint !== true)
          throw new Error("MCP reference must advertise read-only access");
        const answer = callResult.parse(
          await post("tools/call", {
            name: binding.remoteName,
            arguments: binding.arguments,
          }),
        );
        const text = answer.content
          .flatMap((item) =>
            item.type === "text" && item.text ? [item.text] : [],
          )
          .join("\n")
          .trim();
        if (answer.isError || !text)
          throw new Error("MCP reference returned no text");
        return text.slice(0, 1800);
      }
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
    throw new Error("MCP reference tool not found");
  } finally {
    if (session)
      await fetch(binding.endpoint, {
        method: "DELETE",
        headers: headers(),
        signal: AbortSignal.timeout(1500),
        redirect: "error",
        cache: "no-store",
      })
        .then((response) => response.body?.cancel())
        .catch(() => {});
  }
}
