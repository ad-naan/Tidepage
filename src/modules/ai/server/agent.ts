import "server-only";
import { z } from "zod";
import { acquireModelSlot, requestModel } from "./provider";
import type { ModelAccess } from "./usage";
import { boundedBody } from "@/server/http/body";

export type ToolSource = {
  facts: { label: string; value: string }[];
  links?: { title: string; href: string }[];
};
export type AgentEvidence = ToolSource & { id: string; tool: string };
type ToolResult = { context?: unknown; source: ToolSource } | { error: string };
type AgentTool = {
  name: string;
  description: string;
  parameters: z.ZodType;
  invoke: (input: unknown, signal: AbortSignal) => Promise<ToolResult>;
};
export function readTool<T extends z.ZodType>(
  name: string,
  description: string,
  parameters: T,
  execute: (input: z.infer<T>, signal: AbortSignal) => Promise<ToolResult>,
): AgentTool {
  return {
    name,
    description,
    parameters,
    invoke: (input, signal) => execute(parameters.parse(input), signal),
  };
}

type AgentSkill<T> = {
  instructions: string;
  tools: readonly AgentTool[];
  requiredTools: readonly string[];
  report: z.ZodType<T>;
  citations: (report: T) => readonly string[];
};

const callSchema = z.object({
  id: z.string().min(1).max(128),
  type: z.literal("function"),
  function: z.object({
    name: z.string().max(64),
    arguments: z.string().max(3000),
  }),
});
const assistantSchema = z.object({
  content: z.string().max(14_000).nullable().optional(),
  tool_calls: z.array(callSchema).max(6).optional(),
});
const turnSchema = z.object({
  choices: z.tuple([
    z.object({
      finish_reason: z.enum(["stop", "tool_calls"]),
      message: assistantSchema,
    }),
  ]),
});
type Message =
  | { role: "system" | "user"; content: string }
  | ({ role: "assistant" } & z.infer<typeof assistantSchema>)
  | { role: "tool"; tool_call_id: string; content: string };

export async function runReadOnlyAgent<T>(
  access: ModelAccess,
  skill: AgentSkill<T>,
  task: string,
  signal: AbortSignal,
) {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(60_000)]);
  const messages: Message[] = [
    { role: "system", content: skill.instructions },
    { role: "user", content: task },
  ];
  const evidence: AgentEvidence[] = [];
  const used = new Set<string>();
  const callsSeen = new Set<string>();
  const tools = skill.tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.parameters),
    },
  }));
  const release = acquireModelSlot(access);
  try {
    for (let round = 0; round < 8; round++) {
      deadline.throwIfAborted();
      if (JSON.stringify(messages).length > 48_000) break;
      const response = await requestModel(
        access,
        {
          messages,
          tools,
          tool_choice: "auto",
          stream: false,
          max_completion_tokens: 2200,
        },
        deadline,
        "application/json",
      );
      const bytes = await boundedBody(response, 96 * 1024).catch(() => {
        throw new Error("Model turn response exceeded its size limit");
      });
      const [{ message, finish_reason }] = turnSchema.parse(
        JSON.parse(new TextDecoder().decode(bytes)),
      ).choices;
      if (finish_reason === "tool_calls") {
        if (!message.tool_calls?.length)
          throw new Error("Model stopped without providing its tool calls");
        messages.push({
          role: "assistant",
          content: message.content ?? null,
          tool_calls: message.tool_calls,
        });
        for (const call of message.tool_calls) {
          deadline.throwIfAborted();
          if (callsSeen.has(call.id) || callsSeen.size >= 12)
            throw new Error("Agent tool budget exceeded");
          callsSeen.add(call.id);
          const tool = skill.tools.find(
            (tool) => tool.name === call.function.name,
          );
          let content = JSON.stringify({
            error:
              "Unknown tool or invalid arguments. Use the declared tools and schema.",
          });
          let input: unknown;
          try {
            input = JSON.parse(call.function.arguments);
          } catch {
            /* Report invalid arguments to the model. */
          }
          const args = tool?.parameters.safeParse(input);
          if (tool && args?.success) {
            const result = await tool.invoke(input, deadline);
            if ("source" in result) {
              const entry = {
                ...result.source,
                id: `E${evidence.length + 1}`,
                tool: tool.name,
              };
              content = JSON.stringify({
                evidence: entry,
                context: result.context,
              });
              if (content.length > 12_000)
                throw new Error(
                  "Agent tool result exceeded the context budget",
                );
              evidence.push(entry);
              used.add(tool.name);
            } else content = JSON.stringify(result);
          }
          messages.push({ role: "tool", tool_call_id: call.id, content });
        }
        continue;
      }
      const missing = skill.requiredTools.filter((name) => !used.has(name));
      if (missing.length) {
        messages.push({
          role: "user",
          content: `Complete these required checks by calling their tools: ${missing.join(", ")}`,
        });
        continue;
      }
      let report: T;
      try {
        report = skill.report.parse(
          JSON.parse(
            message.content?.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "") ??
              "",
          ),
        );
        if (
          skill
            .citations(report)
            .some((id) => !evidence.some((entry) => entry.id === id))
        )
          throw new Error("Unknown evidence reference");
      } catch {
        messages.push({
          role: "user",
          content:
            "Return the report as valid JSON in the requested shape, using only evidence IDs returned by the tools.",
        });
        continue;
      }
      return { report, evidence };
    }
    throw new Error(
      "Agent could not complete the required checks within its budget",
    );
  } finally {
    release();
  }
}
