import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { NextResponse } from "next/server";
export const runtime = "nodejs";

/**
 * 설정값
 */
const TOP_K = 5; // 검색할 문단 개수
const EMBEDDING_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-4.1-mini";

/**
 * OpenAI 클라이언트
 * (API 키는 Vercel 환경변수 OPENAI_API_KEY 사용)
 */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * 코사인 유사도 계산
 */
function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * POST /api/chat
 */
export async function POST(req: Request) {
  try {
    /**
     * 0. 로그인 사용자 확인 (쿠키)
     *    - /api/auth/login 에서 userId 쿠키를 설정해둔 상태
     */
    const cookie = req.headers.get("cookie") || "";
    const userIdMatch = cookie.match(/userId=([^;]+)/);
    const userId = userIdMatch
      ? decodeURIComponent(userIdMatch[1])
      : null;

    if (!userId) {
      return NextResponse.json(
        { error: "not logged in" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const question: string = body.question;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    /**
     * 1. 사용자 질문 임베딩 생성
     */
    const queryEmbeddingRes = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });

    const queryEmbedding = queryEmbeddingRes.data[0].embedding;

    /**
     * 2. embeddings.json 로드
     */
    const dataPath = path.join(
      process.cwd(),
      "data",
      "embeddings.json"
    );

    const raw = fs.readFileSync(dataPath, "utf-8");
    const documents = JSON.parse(raw);

    /**
     * 3. 유사도 계산
     */
    const scored = documents.map((doc: any) => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    scored.sort((a: any, b: any) => b.score - a.score);
    const topDocs = scored.slice(0, TOP_K);

    /**
     * 4. GPT에 전달할 컨텍스트 구성
     */
    const context = topDocs
      .map(
        (d: any, i: number) =>
          `[출처 ${i + 1}] (${d.manual})\n${d.text}`
      )
      .join("\n\n");

    /**
     * 🔹 사용자 질문 저장 (Google Spreadsheet)
     */
    await fetch(process.env.SHEET_API_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addMessage",
        userId,
        role: "user",
        text: question,
        secret: process.env.SHEET_SHARED_SECRET,
      }),
    });

    /**
     * 5. GPT 답변 생성
     */
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
너는 3D 프린터 매뉴얼 전용 AI 챗봇이다.
아래 제공된 매뉴얼 내용만 근거로 답변해라.

- 매뉴얼에 없는 내용은 추측하지 말고 "매뉴얼에 해당 내용이 없습니다"라고 말해라
- 답변 마지막에 반드시 출처 번호를 명시해라
          `.trim(),
        },
        {
          role: "user",
          content: `
[매뉴얼 발췌]
${context}

[질문]
${question}
          `.trim(),
        },
      ],
    });

    const answer = completion.choices[0].message.content;

    /**
     * 🔹 GPT 답변 저장 (Google Spreadsheet)
     */
    await fetch(process.env.SHEET_API_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addMessage",
        userId,
        role: "assistant",
        text: answer,
        sources: topDocs.map((d: any) => ({
          id: d.id,
          manual: d.manual,
          section: d.section,
        })),
        secret: process.env.SHEET_SHARED_SECRET,
      }),
    });

    /**
     * 6. 응답 반환
     */
    return NextResponse.json({
      answer,
      sources: topDocs.map((d: any) => ({
        id: d.id,
        manual: d.manual,
        section: d.section,
      })),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}
