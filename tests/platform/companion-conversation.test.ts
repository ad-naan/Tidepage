import { test } from "node:test";
import assert from "node:assert/strict";
import {
  companionConversationSchema,
  converseCompanions,
  type CompanionTurn,
} from "../../src/modules/world/domain/companion-conversation";
import * as THREE from "three";
import { createHarborTurtle } from "../../src/modules/world/runtime/createHarborTurtle";
import { answerCompanionConversation } from "../../src/modules/world/server/companion-conversation";
import { updateHarborSpeechAnchors } from "../../src/modules/world/runtime/harborSpeechAnchors";
import { createContentTestStore } from "../fixtures/content";
import type { Database } from "../../src/server/db/client";

test("provider-backed turns preserve role and prior replies through the real SSE adapter", async (t) => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  process.env.AI_CHAT_COMPLETIONS_URL =
    "http://127.0.0.1:9000/v1/chat/completions";
  process.env.AI_MODEL = "test-companions";
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const access = {
    audience: "harbor",
    accountId: "reader",
    db: fixture.db as unknown as Database,
  } as const;
  const inputs: { speaker: string; turns: CompanionTurn[] }[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const input = JSON.parse(body.messages[1].content);
      inputs.push(input);
      assert.match(
        body.messages[0].content,
        input.speaker === "otter" ? /curious, playful/ : /patient sea turtle/,
      );
      const frame = (choice: unknown) =>
        `data: ${JSON.stringify({ choices: [choice] })}\n\n`;
      return new Response(
        frame({
          delta: {
            content: JSON.stringify({ reply: `Response ${inputs.length}` }),
          },
        }) +
          frame({ finish_reason: "stop" }) +
          "data: [DONE]\n\n",
      );
    },
  );
  const turns = await converseCompanions({
    signal: new AbortController().signal,
    next: (turns, signal) =>
      answerCompanionConversation(
        access,
        { locale: "en", night: true, topic: "Stars over the bay", turns },
        signal,
      ),
    speak: () => {},
    wait: async () => {},
  });
  assert.equal(inputs.length, 4);
  assert.equal(inputs[1].turns[0].reply, turns[0].reply);
  assert.equal(inputs[3].turns[2].reply, turns[2].reply);
  assert.deepEqual(
    turns.map((turn) => turn.speaker),
    ["otter", "turtle", "otter", "turtle"],
  );
});

test("speech projection stays within narrow screens and hides absent, distant and behind-camera actors", () => {
  for (const width of [320, 390, 1280]) {
    const node = {
      dataset: { worldSpeaker: "otter", visible: "false" },
      offsetWidth: 260,
      offsetHeight: 90,
      style: { translate: "", setProperty: () => {} },
    };
    const host = {
      dataset: {},
      clientWidth: width,
      clientHeight: 844,
      querySelectorAll: () => [node],
    } as unknown as HTMLElement;
    const camera = new THREE.PerspectiveCamera(48, width / 844, 0.1, 200);
    const player = new THREE.Vector3(-2.3, 0.49, 2.6),
      position = new THREE.Vector3(-3.4, 0.49, 1.2);
    camera.position.set(-2, 3.4, 9);
    camera.lookAt(-3, 0.55, 2);
    camera.updateMatrixWorld();
    updateHarborSpeechAnchors(host, camera, player, () => ({
      position,
      height: 1.2,
    }));
    assert.equal(node.dataset.visible, "true");
    const [left, top] = node.style.translate.split(" ").map(parseFloat);
    assert.ok(left >= 12 && left + 260 <= width - 12);
    assert.ok(top >= 72);
    updateHarborSpeechAnchors(host, camera, player, () => null);
    assert.equal(node.dataset.visible, "false");
    updateHarborSpeechAnchors(host, camera, player, () => ({
      position: new THREE.Vector3(50, 0, 50),
      height: 1.2,
    }));
    assert.equal(node.dataset.visible, "false");
    camera.lookAt(-2, 3.4, 20);
    camera.updateMatrixWorld();
    updateHarborSpeechAnchors(host, camera, player, () => ({
      position,
      height: 1.2,
    }));
    assert.equal(node.dataset.visible, "false");
  }
});

test("AI companions take four causal turns, each seeing the actual previous reply", async () => {
  const calls: CompanionTurn[][] = [],
    spoken: CompanionTurn[] = [],
    waits: number[] = [];
  await converseCompanions({
    signal: new AbortController().signal,
    next: async (turns) => {
      calls.push(turns);
      return {
        speaker: turns.length % 2 ? "turtle" : "otter",
        reply: `Reply to ${turns.at(-1)?.reply ?? "the sea"}`,
      };
    },
    speak: (turn) => spoken.push(turn),
    wait: async (ms) => {
      waits.push(ms);
    },
  });
  assert.deepEqual(
    spoken.map((t) => t.speaker),
    ["otter", "turtle", "otter", "turtle"],
  );
  assert.deepEqual(
    calls.map((t) => t.length),
    [0, 1, 2, 3],
  );
  assert.equal(calls[3][2].reply, spoken[2].reply);
  assert.ok(waits.every((ms) => ms >= 5000 && ms <= 14000));
});
test("stopping while listening prevents any subsequent generation", async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    converseCompanions({
      signal: controller.signal,
      next: async () => {
        calls++;
        return { speaker: "otter", reply: "Hello" };
      },
      speak: () => {},
      wait: async () => {
        controller.abort();
      },
    }),
    { name: "AbortError" },
  );
  assert.equal(calls, 1);
});
test("a late aborted model reply is never shown; invalid speaker order is rejected", async () => {
  const controller = new AbortController();
  let shown = false;
  await assert.rejects(
    converseCompanions({
      signal: controller.signal,
      next: async () => {
        controller.abort();
        return { speaker: "otter", reply: "late" };
      },
      speak: () => {
        shown = true;
      },
      wait: async () => {},
    }),
  );
  assert.equal(shown, false);
  const input = {
    locale: "zh-CN",
    night: true,
    topic: "stars",
    turns: [{ speaker: "turtle", reply: "wrong first speaker" }],
  };
  assert.equal(companionConversationSchema.safeParse(input).success, false);
  assert.equal(
    companionConversationSchema.safeParse({
      ...input,
      turns: [],
      speaker: "host",
    }).success,
    false,
  );
});
test("turtle geometry is finite, remains grounded and releases GPU resources", () => {
  const scene = new THREE.Scene(),
    turtle = createHarborTurtle(scene),
    geometries = new Set<THREE.BufferGeometry>();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
      assert.ok(
        Array.from(o.geometry.getAttribute("position").array).every(
          Number.isFinite,
        ),
      );
    }
  });
  let disposed = 0;
  geometries.forEach((g) => g.addEventListener("dispose", () => disposed++));
  turtle.update(12, new THREE.Vector3(-3.4, 0.49, 1.2), true, true);
  scene.updateMatrixWorld(true);
  assert.equal(turtle.root.position.y, 0.49);
  assert.equal(turtle.root.scale.y, 1);
  scene.traverse((o) =>
    assert.ok(o.matrixWorld.elements.every(Number.isFinite)),
  );
  turtle.dispose();
  assert.equal(disposed, geometries.size);
  assert.equal(scene.children.length, 0);
});
