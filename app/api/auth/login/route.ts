import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  const { userId, password } = await req.json();

  const res = await fetch(process.env.SHEET_API_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "login",
      userId,
      password,
      secret: process.env.SHEET_SHARED_SECRET,
    }),
  });

  const data = await res.json();
  if (!data.ok) return NextResponse.json({ error: "invalid" }, { status: 401 });

  const token = crypto
    .createHmac("sha256", process.env.SESSION_SECRET!)
    .update(userId)
    .digest("hex");

  const r = NextResponse.json({ ok: true });
  r.cookies.set("session", token, { httpOnly: true });
  r.cookies.set("userId", userId, { httpOnly: true });
  return r;
}
