import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      return NextResponse.json({ error: "missing credentials" }, { status: 400 });
    }

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

    if (!data || data.ok !== true) {
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }

    const token = crypto
      .createHmac("sha256", process.env.SESSION_SECRET!)
      .update(userId)
      .digest("hex");

    const response = NextResponse.json({
      ok: true,
      userId,
      dailyLimit: data.dailyLimit ?? null,
      usedToday: data.usedToday ?? null,
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });

    response.cookies.set("userId", userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
