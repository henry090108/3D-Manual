import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  const { userId, password } = await req.json();

  if (!userId || !password) {
    return NextResponse.json(
      { error: "missing credentials" },
      { status: 400 }
    );
  }

  // Apps Script에 로그인 검증 요청
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

  if (!data.ok) {
    return NextResponse.json(
      { error: "invalid credentials" },
      { status: 401 }
    );
  }

  /**
   * ✅ Next.js 15 정석 쿠키 설정
   * - cookies() 직접 사용 ❌
   * - NextResponse.cookies.set() ⭕
   */
  const response = NextResponse.json({
    ok: true,
    role: data.role,
    dailyLimit: data.dailyLimit,
    usedToday: data.usedToday,
  });

  response.cookies.set({
    name: "userId",
    value: userId,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  // (선택) 세션 서명 토큰
  const token = crypto
    .createHmac("sha256", process.env.SESSION_SECRET!)
    .update(userId)
    .digest("hex");

  response.cookies.set({
    name: "session",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
