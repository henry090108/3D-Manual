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

    const response = NextResponse.json({
      ok: true,
      role: data.role,
      dailyLimit: data.dailyLimit,
      usedToday: data.usedToday,
    });

    /**
     * 🔥 Vercel 확정 세팅
     */
    response.cookies.set({
      name: "userId",
      value: userId,
      httpOnly: true,
      path: "/",
      sameSite: "none", // ⭐ 변경
      secure: true,     // ⭐ 반드시 true
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
