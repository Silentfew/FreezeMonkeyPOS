import { cookies } from "next/headers";

export const SESSION_COOKIE = "pos_session";

export type SessionUser = {
  userId: string;
  name: string;
  role: "OWNER" | "STAFF";
};

export function parseSessionCookie(rawValue: string | undefined): SessionUser | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.name === "string" &&
      (parsed.role === "OWNER" || parsed.role === "STAFF") &&
      typeof parsed.userId === "string"
    ) {
      return { name: parsed.name, role: parsed.role, userId: parsed.userId };
    }
  } catch (error) {
    console.error("Failed to parse session cookie", error);
  }

  return null;
}

export function getSessionUser(): SessionUser | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  return parseSessionCookie(raw);
}
