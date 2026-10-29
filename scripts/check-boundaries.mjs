import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, relative, dirname, extname } from "node:path";
import ts from "typescript";
const root = resolve("src"),
  graph = new Map(),
  errors = [];
const normalized = (p) => relative(root, p).replaceAll("\\", "/");
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(resolve(dir, e.name))
      : /\.tsx?$/.test(e.name)
        ? [resolve(dir, e.name)]
        : [],
  );
}
function local(from, name) {
  const base = name.startsWith("@/")
    ? resolve(root, name.slice(2))
    : name.startsWith(".")
      ? resolve(dirname(from), name)
      : null;
  if (!base) return null;
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
  ].find((p) => existsSync(p) && [".ts", ".tsx"].includes(extname(p)));
}
for (const file of files(root)) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = [];
  let client = false,
    server = false;
  for (const node of source.statements) {
    if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)) {
      client ||= node.expression.text === "use client";
    }
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      server ||= node.moduleSpecifier.text === "server-only";
      const onlyTypes =
        node.importClause?.isTypeOnly ||
        (node.importClause?.namedBindings &&
          ts.isNamedImports(node.importClause.namedBindings) &&
          !node.importClause.name &&
          node.importClause.namedBindings.elements.every((e) => e.isTypeOnly));
      if (!onlyTypes) imports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isExportDeclaration(node) &&
      !node.isTypeOnly &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.push(node.moduleSpecifier.text);
  }
  function dynamic(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      imports.push(node.arguments[0].text);
    ts.forEachChild(node, dynamic);
  }
  dynamic(source);
  graph.set(file, {
    client,
    server,
    imports,
    edges: imports.map((n) => local(file, n)).filter(Boolean),
  });
}
for (const [file, node] of graph) {
  const path = normalized(file),
    module = path.match(/^modules\/([^/]+)\/([^/]+)/);
  for (const edge of node.edges) {
    const dest = normalized(edge),
      target = dest.match(/^modules\/([^/]+)\/([^/]+)/);
    if (path.startsWith("shared/") && !dest.startsWith("shared/"))
      errors.push(`${path}: shared must not depend on ${dest}`);
    if (
      module?.[2] === "domain" &&
      !dest.startsWith(`modules/${module[1]}/domain/`) &&
      !dest.startsWith("shared/")
    )
      errors.push(`${path}: domain depends on ${dest}`);
    if (
      module?.[2] === "application" &&
      !dest.startsWith(`modules/${module[1]}/domain/`) &&
      !dest.startsWith(`modules/${module[1]}/application/`) &&
      !dest.startsWith("shared/")
    )
      errors.push(`${path}: application depends on ${dest}`);
    if (
      module &&
      target &&
      module[1] !== target[1] &&
      !["domain", "ui", "server"].includes(target[2])
    )
      errors.push(`${path}: cross-module internal import ${dest}`);
    if (
      path.startsWith("app/") &&
      target &&
      !["domain", "ui", "server"].includes(target[2])
    )
      errors.push(`${path}: route bypasses module entry ${dest}`);
    if (
      dest.endsWith("demo-data.ts") &&
      !path.startsWith("modules/content/infrastructure/")
    )
      errors.push(`${path}: demo data escaped its adapter`);
  }
  if (node.client) {
    const visited = new Set();
    function visit(cursor, trail) {
      if (visited.has(cursor)) return;
      visited.add(cursor);
      const child = graph.get(cursor);
      if (!child) return;
      if (child.server || normalized(cursor).startsWith("server/"))
        errors.push(
          `Client boundary: ${trail.join(" -> ")} -> ${normalized(cursor)}`,
        );
      child.edges.forEach((edge) =>
        visit(edge, [...trail, normalized(cursor)]),
      );
    }
    visit(file, []);
  }
}
if (errors.length) {
  console.error([...new Set(errors)].join("\n"));
  process.exitCode = 1;
} else
  console.info(
    `Architecture boundaries checked across ${graph.size} source files.`,
  );
