// Opt-in integration check: real configured model, real HTTP routes and disposable DB sessions.
// node scripts/verify-live-site.mjs http://127.0.0.1:3002 --live-ai
// Start an isolated production preview with SITE_URL set to that same origin.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import pg from "pg";

const workbenchOnly = process.argv.includes("--workbench-only");
assert.ok(
  process.argv.includes("--live-ai") || workbenchOnly,
  "Requires --live-ai or --workbench-only; creates a disposable test account",
);
const origin = new URL(process.argv[2]);
assert.ok(
  ["localhost", "127.0.0.1"].includes(origin.hostname) &&
    origin.protocol === "http:",
  "Local previews only",
);
config({ path: [".env.local", ".env"], quiet: true });
const require = createRequire(import.meta.url);
const { chromium } = require(
  resolve(".cache/world-playtest/node_modules/playwright-core"),
);
const catalog = require("../src/shared/i18n/messages/zh-CN.json");
const labels = catalog.world.harbor;
const output = resolve(
  workbenchOnly ? ".cache/site-workbench" : ".cache/live-site",
);
await mkdir(output, { recursive: true });
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 5000,
});
const id = randomUUID(),
  token = randomBytes(32).toString("base64url");
const report = {
  pages: [],
  errors: [],
  networkNotes: [],
  ai: [],
  checks: [],
  cleanup: false,
};
let browser, page;
try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO users (id, display_name, role) VALUES ($1, $2, 'reader')",
      [id, "临时站点验收旅人"],
    );
    await client.query(
      "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 minutes')",
      [createHash("sha256").update(token).digest("hex"), id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYTEST_CHROME ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await context.addCookies([
    {
      name: "adnaan_session",
      value: token,
      url: origin.origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (m.text().includes("WebSocket"))
      report.networkNotes.push(
        "Existing realtime gateway rejects the isolated preview origin; multiplayer is tested separately.",
      );
    else report.errors.push(m.text());
  });
  const session = await context.request.get(
    new URL("/api/v1/session", origin).href,
  );
  assert.equal(session.status(), 200);
  assert.equal((await session.json()).data.id, id);
  report.checks.push(
    "Real database-backed cookie session accepted; OAuth callback itself is not simulated or verified",
  );
  if (!workbenchOnly) {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
      for (const locale of ["zh-CN", "en"]) {
        for (const path of [
          "",
          "/articles",
          "/notes",
          "/projects",
          "/quotes",
          "/gallery",
          "/friends",
          "/about",
          "/site",
        ]) {
          const url = `/${locale}${path}`;
          const response = await page.goto(new URL(url, origin).href, {
            waitUntil: "domcontentloaded",
          });
          await page.locator("main").waitFor();
          await page.waitForTimeout(350);
          const layout = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            text: document.querySelector("main")?.innerText.length ?? 0,
          }));
          report.pages.push({
            url,
            width,
            status: response.status(),
            ...layout,
          });
          if (response.status() !== 200 || layout.overflow || !layout.text)
            report.errors.push(
              `Page check: ${url} at ${width}: ${JSON.stringify(layout)}, HTTP ${response.status()}`,
            );
          if (locale === "zh-CN" && ["", "/articles"].includes(path))
            await page.screenshot({
              path: resolve(
                output,
                `${path ? "articles" : "home"}-${width}.png`,
              ),
            });
        }
      }
    }
    for (const path of [
      "/feed.xml",
      "/sitemap.xml",
      "/robots.txt",
      "/llms.txt",
    ]) {
      const response = await context.request.get(new URL(path, origin).href);
      assert.equal(response.status(), 200, path);
      assert.ok((await response.body()).length > 0, path);
    }
    report.checks.push(
      "Public publishing endpoints respond with non-empty content",
    );
    console.log(
      `Checked ${report.pages.length} public page/viewport combinations`,
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(new URL("/zh-CN/explore", origin).href, {
      waitUntil: "domcontentloaded",
    });
    await page.locator("canvas").waitFor();
    await page
      .getByRole("button", { name: labels.social.company, exact: true })
      .click();
    const leave = page.getByRole("button", {
      name: labels.network.leave,
      exact: true,
    });
    if (await leave.count()) await leave.click();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: labels.guide.title, exact: true })
      .click();
    await page
      .getByRole("button", { name: labels.companion.meet, exact: true })
      .click();
    await page
      .getByRole("textbox", { name: labels.companion.question })
      .waitFor();
    await page
      .getByRole("textbox", { name: labels.companion.question })
      .fill("今天有点累，想和你一起看看海。你看到了什么？");
    const guideResponse = page.waitForResponse(
      (r) => r.url().endsWith("/api/v1/world/guide"),
      { timeout: 70000 },
    );
    await page
      .getByRole("button", { name: labels.companion.ask, exact: true })
      .click();
    const guide = await guideResponse;
    assert.equal(guide.status(), 200, "Real harbor AI request failed");
    const guideData = (await guide.json()).data;
    assert.ok(guideData.reply?.length);
    await page.getByText(guideData.reply, { exact: true }).waitFor();
    report.ai.push({ kind: "guide", reply: guideData.reply });
    await page.screenshot({ path: resolve(output, "real-ai-guide.png") });
    console.log("Real model guide reply appeared in the scene");
    const turnOne = page.waitForResponse(
      (r) => r.url().endsWith("/api/v1/world/companions"),
      { timeout: 70000 },
    );
    await page
      .getByRole("button", { name: labels.speech.listen, exact: true })
      .click();
    const firstResponse = await turnOne;
    assert.equal(firstResponse.status(), 200, "Real otter request failed");
    const first = (await firstResponse.json()).data;
    assert.equal(first.speaker, "otter");
    report.ai.push(first);
    const turnTwo = await page.waitForResponse(
      (r) => r.url().endsWith("/api/v1/world/companions"),
      { timeout: 85000 },
    );
    assert.equal(turnTwo.status(), 200, "Real turtle request failed");
    const second = (await turnTwo.json()).data;
    assert.equal(second.speaker, "turtle");
    assert.deepEqual(turnTwo.request().postDataJSON().turns, [first]);
    report.ai.push(second);
    await page.getByText(second.reply, { exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, "real-ai-companions.png") });
    await page
      .getByRole("button", { name: labels.companion.stop, exact: true })
      .click();
    report.checks.push(
      "Real otter and turtle replies displayed; second request includes the actual first reply; stopped after two turns",
    );
    console.log("Real companion conversation passed");
    // Only this newly-created fixture changes role. Existing accounts/content stay untouched.
    await pool.query("UPDATE users SET role='author' WHERE id=$1", [id]);
    const writing = await context.request.post(
      new URL("/api/v1/ai/writing", origin).href,
      {
        headers: { Origin: origin.origin },
        data: {
          task: "write",
          locale: "zh-CN",
          prompt: "用一句简短的中文润色选中文本，不添加事实。",
          context: "今天傍晚，我在海边散步。",
          selection: "今天傍晚，我在海边散步。",
        },
        timeout: 70000,
      },
    );
    assert.equal(writing.status(), 200, "Real writing AI request failed");
    const stream = await writing.text();
    assert.ok(
      stream.includes('"type":"delta"') && stream.includes('"type":"done"'),
      "Writing stream did not complete",
    );
    report.checks.push(
      "Real writing assistant SSE produced text and completed",
    );
  }
  const health = await context.request.get(
    new URL("/api/v1/health/ready", origin).href,
  );
  report.health = (await health.json()).data;
  const oauth = await context.request.get(
    new URL("/api/v1/auth/github", origin).href,
    { maxRedirects: 0 },
  );
  assert.equal(oauth.status(), 302);
  const authorize = new URL(oauth.headers().location);
  assert.equal(authorize.hostname, "github.com");
  assert.ok(authorize.searchParams.get("state"));
  report.checks.push(
    "GitHub login initiation returns an authorization redirect and state; no external authorization or callback performed",
  );
  await page.goto(new URL("/zh-CN/articles", origin).href, {
    waitUntil: "domcontentloaded",
  });
  const articleLink = page.locator('main a[href^="/zh-CN/articles/"]').first();
  const articleTitle = (await articleLink.locator("h3").innerText()).trim();
  const articleUrl = await articleLink.getAttribute("href");
  const search = page.getByRole("textbox", {
    name: catalog.articles.search,
    exact: true,
  });
  await search.fill(articleTitle.slice(0, 8));
  await page.waitForURL((url) => Boolean(url.searchParams.get("q")));
  await page.locator(`main a[href="${articleUrl}"]`).first().waitFor();
  await page.locator(`main a[href="${articleUrl}"]`).first().click();
  await page.waitForURL((url) => url.pathname === articleUrl);
  await page
    .getByRole("heading", { name: articleTitle, exact: true })
    .waitFor();
  await page.screenshot({ path: resolve(output, "article-reading.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  const proseBounds = await page.locator("main .prose").evaluate((el) => {
    const bounds = el.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, width: bounds.width };
  });
  assert.ok(
    proseBounds.left >= 0 &&
      proseBounds.right <= 390 &&
      proseBounds.width <= 390,
    "Mobile prose is clipped even though the page hides horizontal overflow",
  );
  report.mobileProse = proseBounds;
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Article overflows mobile viewport",
  );
  await page.screenshot({
    path: resolve(output, "article-reading-mobile.png"),
  });
  report.checks.push(
    "Search finds a published article; navigation opens it; mobile reading has no horizontal page overflow",
  );
  await pool.query("UPDATE users SET role='author' WHERE id=$1", [id]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(new URL("/zh-CN/admin/articles/new", origin).href, {
    waitUntil: "domcontentloaded",
  });
  const title = page.getByRole("textbox", {
    name: catalog.admin.editor.fields.title,
    exact: true,
  });
  const draftTitle = "验收草稿：海边的一天";
  const draftText = "这是一条临时验收内容，用于确认真实浏览器保存和刷新恢复。";
  await title.fill(draftTitle);
  await page.locator('[contenteditable="true"]:visible').fill(draftText);
  const save = page.getByRole("button", {
    name: catalog.admin.editor.save,
    exact: true,
  });
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/workbench/articles") &&
      r.request().method() !== "GET",
  );
  await save.click();
  assert.equal((await saved).status(), 200);
  await page.waitForURL(/\/admin\/articles\/[^/]+\/edit$/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await title.waitFor();
  assert.equal(await title.inputValue(), draftTitle);
  assert.equal(
    await page.locator('[contenteditable="true"]:visible').innerText(),
    draftText,
  );
  await page
    .getByRole("button", { name: catalog.admin.editor.preview, exact: true })
    .click();
  await page
    .getByText(draftText, { exact: true })
    .filter({ visible: true })
    .waitFor();
  await page.screenshot({ path: resolve(output, "saved-draft-preview.png") });
  report.checks.push(
    "Browser-created private article draft saves through real API, survives reload and renders in preview; never published",
  );
  report.finalHealth = (
    await (
      await context.request.get(new URL("/api/v1/health/ready", origin).href)
    ).json()
  ).data;
  assert.equal(
    report.finalHealth.status,
    "ready",
    "Services did not become ready",
  );
  assert.equal(report.errors.length, 0, report.errors.join("\n"));
} catch (error) {
  report.failure =
    error instanceof Error ? error.message : "Verification failed";
  await page
    ?.screenshot({ path: resolve(output, "failure.png") })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await browser?.close();
  try {
    await pool.query("DELETE FROM users WHERE id=$1", [id]);
    const result = await pool.query(
      "SELECT (SELECT count(*) FROM users WHERE id=$1) + (SELECT count(*) FROM sessions WHERE user_id=$1) + (SELECT count(*) FROM workbench_records WHERE owner_id=$1) AS count",
      [id],
    );
    report.cleanup = Number(result.rows[0].count) === 0;
  } finally {
    await pool.end();
  }
  report.networkNotes = [...new Set(report.networkNotes)];
  await writeFile(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}
