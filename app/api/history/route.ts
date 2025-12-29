import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const userId = cookies().get("userId")?.value;
  if (!userId) {
    return NextResponse.json({}, { status: 401 });
  }

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
  return NextResponse.json(data);
}
