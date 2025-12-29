"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function login() {
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ⭐⭐⭐ 핵심 (쿠키 저장)
        body: JSON.stringify({
          userId: userId.trim(),
          password,
        }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh(); // 쿠키 반영 강제
      } else {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch (e) {
      console.error(e);
      setError("로그인 중 오류가 발생했습니다.");
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: "80px auto" }}>
      <h2>로그인</h2>

      <input
        placeholder="아이디"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        style={{ width: "100%", marginTop: 12, padding: 10 }}
      />

      <input
        placeholder="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginTop: 8, padding: 10 }}
      />

      <button
        onClick={login}
        style={{ width: "100%", marginTop: 12, padding: 10 }}
      >
        로그인
      </button>

      {error && (
        <div style={{ color: "red", marginTop: 10 }}>{error}</div>
      )}
    </main>
  );
}
