export type Role = "reader" | "author" | "admin";
export type Principal = { id: string; displayName: string; role: Role };
