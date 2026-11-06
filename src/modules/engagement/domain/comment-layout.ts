import type { Comment } from "./discussion";

/** Group loaded replies without dropping orphaned replies or looping on malformed trees. */
export function commentLayout(items: readonly Comment[]) {
  const ids = new Set(items.map((item) => item.id));
  const children = new Map<string, Comment[]>();
  const roots: Comment[] = [];
  for (const item of items) {
    if (!item.parentId || !ids.has(item.parentId) || item.parentId === item.id)
      roots.push(item);
    else {
      const siblings = children.get(item.parentId) ?? [];
      siblings.push(item);
      children.set(item.parentId, siblings);
    }
  }
  const seen = new Set<string>();
  const result: { item: Comment; reply: boolean }[] = [];
  function visit(root: Comment) {
    const stack = [{ item: root, reply: Boolean(root.parentId) }];
    while (stack.length) {
      const current = stack.pop()!;
      if (seen.has(current.item.id)) continue;
      seen.add(current.item.id);
      result.push(current);
      const replies = children.get(current.item.id) ?? [];
      for (let i = replies.length - 1; i >= 0; i--)
        stack.push({ item: replies[i], reply: true });
    }
  }
  roots.forEach(visit);
  items.forEach((item) => {
    if (!seen.has(item.id)) visit(item);
  });
  return result;
}
