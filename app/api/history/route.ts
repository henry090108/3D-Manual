import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // ✅ 단순 쿠키 방식 (로그인 되던 시절)
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "not logged in" },
        { status: 401 }
      );
    }

    // Apps Script에서 이전 대화 조회
    const res = await fetch(process.env.SHEET_API_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getMessages",
        userId,
        secret: process.env.SHEET_SHARED_SECRET,
      }),
    });

    const data = await res.json();

    // 기대 형태: { messages: [...] }
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}
