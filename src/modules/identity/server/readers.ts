import "server-only";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { Principal } from "@/modules/identity/domain/principal";
import { usersTable as users } from "@/modules/identity/infrastructure/schema";
import { getDb, type Database } from "@/server/db/client";

const pageSize = 20;
const columns = {
  id: users.id,
  name: users.displayName,
  email: users.email,
  joinedAt: users.createdAt,
};

export async function getReaderDirectory(
  principal: Principal,
  { query, page, readerId }: { query: string; page: number; readerId?: string },
  db?: Database,
) {
  if (principal.role !== "admin") return null;
  const database = db ?? getDb();
  const reader = eq(users.role, "reader");
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const filter = query
    ? and(
        reader,
        or(ilike(users.displayName, pattern), ilike(users.email, pattern)),
      )
    : reader;
  const [total, selected] = await Promise.all([
    database.$count(users, filter),
    readerId
      ? database
          .select(columns)
          .from(users)
          .where(and(reader, eq(users.id, readerId)))
          .limit(1)
      : [],
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const accounts = await database
    .select(columns)
    .from(users)
    .where(filter)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(pageSize)
    .offset((currentPage - 1) * pageSize);
  return {
    accounts,
    selected: selected[0] ?? null,
    total,
    pageCount,
    currentPage,
  };
}
