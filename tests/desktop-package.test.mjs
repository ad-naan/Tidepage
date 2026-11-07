import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

test("release manifests and desktop labels share the blog version", () => {
  const { version } = JSON.parse(read("package.json"));
  assert.equal(
    read("desktop/FyneApp.toml").match(/Version = "([^"]+)"/)[1],
    version,
  );
  assert.equal(
    read("desktop/packaging/Info.plist").match(
      /CFBundleShortVersionString<\/key><string>([^<]+)/,
    )[1],
    version,
  );
  for (const locale of ["zh-CN", "en"]) {
    assert.equal(
      JSON.parse(read(`desktop/internal/i18n/locales/${locale}.json`)).version,
      `v${version}`,
    );
  }
});

// Exercise CI decisions with fake platform commands; this is not a macOS GUI test.
const bash =
  process.platform === "win32"
    ? ["D:/Git/bin/bash.exe", "C:/Program Files/Git/bin/bash.exe"].find(
        existsSync,
      )
    : "bash";
test(
  "macOS package checks distinguish missing graphics from broken packages and crashes",
  { skip: !bash },
  (t) => {
    const cache = resolve(root, ".cache");
    mkdirSync(cache, { recursive: true });
    const dir = mkdtempSync(join(cache, "mac-package-test-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const bin = join(dir, "bin");
    mkdirSync(bin);
    const script = (name, body) =>
      writeFileSync(join(bin, name), `#!/bin/sh\nset -eu\n${body}\n`, {
        mode: 0o755,
      });
    script(
      "ditto",
      `mkdir -p "$4/Tidepage Companion.app/Contents/MacOS"
cat > "$4/Tidepage Companion.app/Contents/MacOS/tidepage-companion" <<'APP'
#!/bin/sh
if [ "$1" = --version ]; then echo "Tidepage Companion \${MOCK_VERSION:-0.0.1}"; exit 0; fi
echo launched > "$MOCK_LAUNCHED"
exec sleep 60
APP
chmod +x "$4/Tidepage Companion.app/Contents/MacOS/tidepage-companion"`,
    );
    script("codesign", 'exit "${MOCK_SIGNATURE:-0}"');
    script("lipo", 'exit "${MOCK_ARCH:-0}"');
    script("plutil", 'if [ "$1" = -extract ]; then echo 0.0.1; fi');
    script(
      "swiftc",
      `if [ "\${MOCK_COMPILE:-0}" != 0 ]; then exit "$MOCK_COMPILE"; fi
printf '#!/bin/sh\\nexit "\${MOCK_GPU:-0}"\\n' > "$3"
chmod +x "$3"`,
    );
    script("swift", 'exit "${MOCK_PREVIEW:-0}"');
    const launched = join(dir, "launched");
    const run = (env) => {
      if (existsSync(launched)) rmSync(launched);
      return spawnSync(
        bash,
        [
          "-c",
          'export PATH="$MOCK_BIN:$PATH"; sh desktop/packaging/check-macos-package.sh fake.zip',
        ],
        {
          cwd: root,
          env: {
            ...process.env,
            GITHUB_STEP_SUMMARY: "",
            REQUIRE_MACOS_GUI: "0",
            MOCK_BIN: bin
              .replaceAll("\\", "/")
              .replace(/^([a-z]):/i, (_, drive) => `/${drive.toLowerCase()}`),
            MOCK_LAUNCHED: launched.replaceAll("\\", "/"),
            ...env,
          },
          encoding: "utf8",
          timeout: 15000,
        },
      );
    };
    const noGpu = run({ MOCK_GPU: "78" });
    assert.equal(noGpu.status, 0, noGpu.stderr);
    assert.match(noGpu.stdout, /NOT VERIFIED/);
    assert.equal(existsSync(launched), false);
    for (const env of [
      { MOCK_GPU: "78", REQUIRE_MACOS_GUI: "1" },
      { MOCK_GPU: "2" },
      { MOCK_COMPILE: "1" },
      { MOCK_SIGNATURE: "1" },
      { MOCK_ARCH: "1" },
      { MOCK_VERSION: "wrong" },
      { MOCK_PREVIEW: "1" },
    ]) {
      const result = run(env);
      assert.equal(result.error, undefined, String(result.error));
      assert.notEqual(result.status, 0, JSON.stringify(env));
    }
    const supported = run({});
    assert.equal(supported.status, 0, supported.stderr);
    assert.equal(existsSync(launched), true);
  },
);
