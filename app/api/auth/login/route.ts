import { NextResponse } from "next/server";
import crypto from "crypto";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      return NextResponse.json(
        { error: "missing credentials" },
        { status: 400 }
      );
    }

    // 1️⃣ Google Apps Script로 로그인 요청
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

    // 2️⃣ 인증 실패
    if (!data.ok) {
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }

    // 3️⃣ 세션 토큰 생성 (HMAC, 서버 전용)
    const token = crypto
      .createHmac("sha256", process.env.SESSION_SECRET!)
      .update(userId)
      .digest("hex");

    // 4️⃣ 응답 + HttpOnly 쿠키 설정
    const response = NextResponse.json({
      ok: true,
      userId,
      dailyLimit: data.dailyLimit ?? null,
      usedToday: data.usedToday ?? null,
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("userId", userId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );
  }
}
