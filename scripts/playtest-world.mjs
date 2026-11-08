// Local browser QA. Test identities and AI fixtures never reach a real provider or database.
// npm install --prefix .cache/world-playtest --cache .cache/npm-playtest playwright-core --ignore-scripts
// node --import tsx scripts/playtest-world.mjs http://127.0.0.1:3002
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { createServer, request as httpRequest } from "node:http";
import assert from "node:assert/strict";
import { createGateway } from "../services/realtime/gateway.ts";
import { issueCoastIdentity } from "../src/server/realtime/coast-tokens.ts";

const require = createRequire(import.meta.url);
const { chromium } = require(
  resolve(".cache/world-playtest/node_modules/playwright-core"),
);
const labels = require("../src/shared/i18n/messages/zh-CN.json").world.harbor;
const origin = new URL(process.argv[2] || "http://127.0.0.1:3002");
assert.ok(
  ["127.0.0.1", "localhost"].includes(origin.hostname),
  "Only local previews are allowed",
);
const output = resolve(".cache/world-playtest/final");
await mkdir(output, { recursive: true });
const token = randomBytes(32).toString("hex");
const identities = new Map();
// Keep the browser's document and WebSocket on one local origin, as in a reverse-proxy deployment.
const proxy = createServer((request, response) => {
  const subject = /qa-player=([a-f0-9-]+)/.exec(
    request.headers.cookie || "",
  )?.[1];
  const principal = identities.get(subject);
  if (request.url?.startsWith("/api/v1/world/") && principal) {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const input = chunks.length
        ? JSON.parse(Buffer.concat(chunks).toString())
        : {};
      let data;
      if (request.url === "/api/v1/world/ticket")
        data = {
          ticket: issueCoastIdentity(
            { subject, name: principal.displayName, host: false },
            token,
          ),
        };
      else if (request.url === "/api/v1/world/guide")
        data = {
          reply: "我们就坐在这里，听海风经过。今天不必急着赶路。",
          destination: null,
          links: [],
        };
      else if (request.url === "/api/v1/world/companions")
        data = {
          speaker: input.turns.length % 2 ? "turtle" : "otter",
          reply:
            input.turns.length % 2
              ? "我也听见了。浪花慢慢回来，我们也慢慢走。"
              : "你听，海风像是在轻轻翻动一封信。",
        };
      response.writeHead(data ? 200 : 404, {
        "Content-Type": "application/json",
      });
      response.end(JSON.stringify({ data }));
    });
    return;
  }
  const upstream = httpRequest(
    new URL(request.url, origin),
    {
      method: request.method,
      headers: {
        ...request.headers,
        host: origin.host,
        "accept-encoding": "identity",
      },
    },
    (incoming) => {
      const headers = { ...incoming.headers };
      if (request.url === "/zh-CN/explore" && principal) {
        const chunks = [];
        incoming.on("data", (chunk) => chunks.push(chunk));
        incoming.on("end", () => {
          const original = Buffer.concat(chunks).toString();
          const value = JSON.stringify(principal).replaceAll('"', '\\"');
          const body = original.replaceAll(
            '\\"principal\\":null',
            `\\"principal\\":${value}`,
          );
          delete headers["content-length"];
          delete headers["transfer-encoding"];
          response.writeHead(incoming.statusCode, headers);
          response.end(body);
        });
      } else {
        response.writeHead(incoming.statusCode, headers);
        incoming.pipe(response);
      }
    },
  );
  upstream.on("error", () => {
    response.writeHead(502);
    response.end();
  });
  request.pipe(upstream);
});
await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
const preview = new URL(`http://127.0.0.1:${proxy.address().port}`);
const gateway = await createGateway({
  host: "127.0.0.1",
  port: 0,
  token,
  origins: [preview.origin],
  namespace: "qa:world",
});
const address = await gateway.listen();
proxy.on("upgrade", (request, socket, head) => {
  const upstream = httpRequest({
    hostname: "127.0.0.1",
    port: address.port,
    path: request.url,
    headers: request.headers,
  });
  upstream.on("upgrade", (response, remote, remoteHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\r\n")}\r\n\r\n`,
    );
    if (head.length) remote.write(head);
    if (remoteHead.length) socket.write(remoteHead);
    socket.pipe(remote).pipe(socket);
    socket.on("error", () => remote.destroy());
    remote.on("error", () => socket.destroy());
  });
  upstream.on("error", () => socket.destroy());
  upstream.end();
});
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYTEST_CHROME ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const report = {
  renderer: "",
  checks: [],
  errors: [],
  ai: "Deterministic UI fixtures; no live model invocation",
  multiplayer: "Real gateway, ephemeral test identities, isolated memory room",
};
const contexts = [];

async function createPlayer(name, width = 1280, height = 800) {
  const subject = randomUUID();
  identities.set(subject, {
    id: subject,
    displayName: name,
    role: "reader",
    avatarUrl: null,
  });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  contexts.push(context);
  await context.addCookies([
    { name: "qa-player", value: subject, url: preview.origin },
  ]);
  await context.addInitScript(() => {
    const Socket = window.WebSocket;
    window.WebSocket = class extends Socket {
      constructor(url, protocols) {
        const parsed = new URL(url);
        if (
          ["localhost", "127.0.0.1"].includes(parsed.hostname) &&
          parsed.pathname.startsWith("/socket.io/")
        ) {
          parsed.host = location.host;
          url = parsed.toString();
        }
        super(url, protocols);
      }
    };
    window.__worldQA = {};
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener("observe", (event) => {
      const renderer = event.detail;
      if (!renderer.isWebGLRenderer) return;
      window.__worldQA.renderer = renderer;
      const render = renderer.render.bind(renderer);
      let depth = 0;
      renderer.render = (scene, camera) => {
        if (!depth) Object.assign(window.__worldQA, { scene, camera });
        depth++;
        try {
          return render(scene, camera);
        } finally {
          depth--;
        }
      };
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(message.text());
  });
  await page.goto(new URL("/zh-CN/explore", preview).href, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(() => Boolean(window.__worldQA?.scene));
  await page.waitForFunction(() =>
    Boolean(document.querySelector('[data-online="true"]')),
  );
  return page;
}

async function capture(page, name) {
  await page.screenshot({ path: resolve(output, `${name}.png`) });
  await writeFile(
    resolve(output, `${name}.json`),
    JSON.stringify(await positions(page), null, 2),
  );
  console.log(`Captured ${name}`);
}
async function destination(page, name) {
  await page
    .getByRole("button", { name: labels.guide.title, exact: true })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
}
async function meet(page) {
  await destination(page, labels.companion.meet);
  await page
    .getByRole("button", { name: labels.company.follow, exact: true })
    .or(page.getByRole("button", { name: labels.company.stay, exact: true }))
    .waitFor();
  await page.waitForTimeout(900);
}
async function positions(page) {
  return page.evaluate(() =>
    window.__worldQA.scene.children
      .filter((o) => o.name.includes("companion"))
      .map((o) => ({ name: o.name, position: o.position.toArray() })),
  );
}

try {
  const page = await createPlayer("海边测试旅人 A");
  const other = await createPlayer("海边测试旅人 B");
  report.renderer = await page.evaluate(() => {
    const gl = window.__worldQA.renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
  });
  await page
    .getByRole("button", { name: labels.speech.nearby, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: labels.speech.placeholder })
    .fill("测试：一起看看海。");
  await page
    .getByRole("button", { name: labels.speech.send, exact: true })
    .click();
  await other.getByText("测试：一起看看海。", { exact: true }).waitFor();
  assert.equal(
    await other.getByText("测试：一起看看海。", { exact: true }).count(),
    1,
  );
  await capture(other, "nearby-player-speech");
  report.checks.push(
    "Two independent browser players exchange one nearby message through the real isolated gateway",
  );
  await meet(page);
  await page
    .getByRole("textbox", { name: labels.companion.question })
    .fill("今天有点累，想听听海。");
  await page
    .getByRole("button", { name: labels.companion.ask, exact: true })
    .click();
  await page
    .getByText("我们就坐在这里，听海风经过。今天不必急着赶路。", {
      exact: true,
    })
    .waitFor();
  await capture(page, "scene-dialogue");
  report.checks.push(
    "Player input and fixture AI response appear above their scene actors",
  );
  await page
    .getByRole("button", { name: labels.speech.listen, exact: true })
    .click();
  await page
    .getByText("我也听见了。浪花慢慢回来，我们也慢慢走。", { exact: true })
    .waitFor();
  await capture(page, "companion-conversation");
  await page
    .getByRole("button", { name: labels.companion.stop, exact: true })
    .click();
  await page
    .getByRole("button", { name: labels.company.follow, exact: true })
    .click();
  await destination(page, labels.destinations.dock);
  await page.waitForFunction(
    () => {
      const p =
        window.__worldQA.scene.getObjectByName("coast-companion").position;
      return Math.abs(p.z - 12) < 0.3;
    },
    { timeout: 10000 },
  );
  await page.waitForTimeout(900);
  await page.keyboard.press("e");
  await page.waitForFunction(
    () =>
      window.__worldQA.scene.getObjectByName("coast-companion").position.y ===
      0.1,
  );
  await page.keyboard.down("s");
  const movie = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const stream = document.querySelector("canvas").captureStream(20);
        const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
        const chunks = [];
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.readAsDataURL(new Blob(chunks, { type: "video/webm" }));
        };
        recorder.start();
        setTimeout(() => recorder.stop(), 4000);
      }),
  );
  await page.keyboard.up("s");
  await writeFile(
    resolve(output, "coast-motion.webm"),
    Buffer.from(movie, "base64"),
  );
  await page.waitForTimeout(1500);
  const sea = await positions(page);
  report.sea = sea;
  const player = sea.find((p) => p.name === "coast-companion").position;
  assert.ok(player[2] > 30, "The boat never left the dock");
  for (const id of ["harbor-otter-companion", "harbor-turtle-companion"]) {
    const npc = sea.find((p) => p.name === id).position;
    assert.ok(
      Math.hypot(npc[0] - player[0], npc[2] - player[2]) < 7,
      `${id} lost the boat`,
    );
  }
  await capture(page, "coast-following");
  report.checks.push(
    "Both companions follow the authoritative player from land into open water",
  );
  await destination(page, labels.destinations.dock);
  await page
    .getByRole("button", { name: labels.interact.land, exact: true })
    .click({ timeout: 15000 });
  await page.waitForFunction(
    () =>
      window.__worldQA.scene.getObjectByName("coast-companion").position.y >
      0.15,
  );
  await destination(page, labels.destinations.cottage);
  await page.waitForFunction(
    () => {
      const p =
        window.__worldQA.scene.getObjectByName("coast-companion").position;
      return Math.hypot(p.x - 3.6, p.z - 0.4) < 0.5;
    },
    null,
    { timeout: 15000 },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await meet(page);
  await page
    .getByRole("textbox", { name: labels.companion.question })
    .fill("这里也能一起聊聊吗？");
  await page
    .getByRole("button", { name: labels.companion.ask, exact: true })
    .click();
  await page
    .getByText("我们就坐在这里，听海风经过。今天不必急着赶路。", {
      exact: true,
    })
    .waitFor();
  await capture(page, "mobile-dialogue");
  const layout = await page.evaluate(() => {
    const composer = document
      .querySelector("[data-world-composer]")
      .getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      composer: { top: composer.top, bottom: composer.bottom },
      bubbles: [
        ...document.querySelectorAll(
          '[data-world-speaker][data-visible="true"]',
        ),
      ].map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      }),
    };
  });
  assert.equal(layout.overflow, false);
  assert.ok(
    layout.composer.bottom - layout.composer.top < 145,
    "Mobile composer takes too much of the playfield",
  );
  assert.ok(layout.bubbles.length > 0);
  assert.ok(
    layout.bubbles.every(
      (b) => b.left >= 0 && b.right <= 390 && b.bottom < layout.composer.top,
    ),
  );
  report.checks.push(
    "390px viewport: visible dialogue bubbles fit the screen and clear the composer",
  );
  report.mobileLayout = layout;
  await page
    .getByRole("button", { name: labels.speech.listen, exact: true })
    .click();
  await page
    .getByText("我也听见了。浪花慢慢回来，我们也慢慢走。", { exact: true })
    .waitFor();
  await capture(page, "mobile-companions");
  const gathered = await positions(page);
  const otterPosition = gathered.find(
    (p) => p.name === "harbor-otter-companion",
  ).position;
  const turtlePosition = gathered.find(
    (p) => p.name === "harbor-turtle-companion",
  ).position;
  assert.ok(
    Math.hypot(
      otterPosition[0] - turtlePosition[0],
      otterPosition[2] - turtlePosition[2],
    ) > 1.8,
    "Companions overlap while talking beside the cottage",
  );
  assert.equal(
    await page
      .locator('[data-world-speaker="otter"][data-visible="true"]')
      .count(),
    1,
  );
  assert.equal(
    await page
      .locator('[data-world-speaker="turtle"][data-visible="true"]')
      .count(),
    1,
  );
  await page
    .getByRole("button", { name: labels.companion.stop, exact: true })
    .click();
  report.glError = await page.evaluate(() =>
    window.__worldQA.renderer.getContext().getError(),
  );
  assert.equal(report.glError, 0);
  assert.equal(report.errors.length, 0, report.errors.join("\n"));
} catch (error) {
  report.failure = String(error.stack || error);
  for (let index = 0; index < contexts.length; index++) {
    const failedPage = contexts[index].pages()[0];
    if (!failedPage) continue;
    await capture(failedPage, `failure-${index}`).catch(() => {});
    report[`failureState${index}`] = {
      text: await failedPage
        .locator("main")
        .innerText()
        .catch(() => ""),
      positions: await positions(failedPage).catch(() => []),
    };
  }
  process.exitCode = 1;
} finally {
  await writeFile(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  await Promise.all(contexts.map((context) => context.close()));
  await browser.close();
  await gateway.close();
  proxy.closeAllConnections();
  await new Promise((resolve) => proxy.close(resolve));
  console.log(JSON.stringify(report, null, 2));
}
