import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TOP_K = 5;
const EMBEDDING_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-4.1-mini";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "not logged in" }, { status: 401 });
    }

    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const queryEmbeddingRes = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });

    const queryEmbedding = queryEmbeddingRes.data[0].embedding;

    const dataPath = path.join(process.cwd(), "data", "embeddings.json");
    const documents = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    const topDocs = documents
      .map((doc: any) => ({
        ...doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding),
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, TOP_K);

    const context = topDocs
      .map((d: any, i: number) => `[출처 ${i + 1}] (${d.manual})\n${d.text}`)
      .join("\n\n");

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

    await fetch(process.env.SHEET_API_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addMessage",
        userId,
        role: "assistant",
        text: answer,
        secret: process.env.SHEET_SHARED_SECRET,
      }),
    });

    return NextResponse.json({
      answer,
      sources: topDocs.map((d: any) => ({
        id: d.id,
        manual: d.manual,
        section: d.section,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }
}
