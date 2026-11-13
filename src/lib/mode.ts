import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/** In personalized-only mode, routes that accept photos or free-text prompts answer 403 (the code stays for later). */
export function closedInPersonalizedMode(): NextResponse | null {
  if (!env.personalizedOnly) return null;
  return NextResponse.json({ error: "This feature is not available right now. Pick a birthday template and type a name." }, { status: 403 });
}
