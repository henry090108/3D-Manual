import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export const runtime = "nodejs";

export async function GET() {
  // ✅ Next.js 15: cookies()는 Promise
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    return NextResponse.json({}, { status: 401 });
  }

  const res = await fetch(process.env.SHEET_API_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "getMessages",
      userId,
      secret: process.env.SHEET_SHARED_SECRET,
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "failed to fetch history" },
      { status: 500 }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
