import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { verifyDownloadToken } from "@/features/downloads/signed-url";
import { getCurrentUser } from "@/features/auth/session";
import { DeliverError, deliverGif } from "@/features/downloads/deliver";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const verified = verifyDownloadToken(params.token);
  if (!verified) return NextResponse.json({ error: "Link expired or invalid." }, { status: 403 });

  let out;
  try {
    // Unlocked only for a creation whose payment the server verified with the gateway.
    out = await deliverGif(verified.generationId, (await getCurrentUser())?.id ?? null);
  } catch (e) {
    if (e instanceof DeliverError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  await db.download.create({
    data: { generationId: out.id, ipHash: createHash("sha256").update(ip).digest("hex").slice(0, 16) },
  });

  return new NextResponse(out.data, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Disposition": `attachment; filename="motionmagic-${out.id}.gif"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
