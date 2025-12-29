import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      return NextResponse.json(
        { error: "missing credentials" },
        { status: 400 }
      );
    }

    // Apps Script로 로그인 검증
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
     * ✅ 로그인 '되던 시절' 방식
     * - NextResponse에 쿠키 직접 세팅
     * - session 서명 없음 (단순)
     */
    const response = NextResponse.json({
      ok: true,
      role: data.role,
      dailyLimit: data.dailyLimit,
      usedToday: data.usedToday,
    });

    response.cookies.set("userId", userId, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}
