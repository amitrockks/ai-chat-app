"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    window.location.href = "/chat";
  }

  return (
    <main className="center-page">
      <form className="card" onSubmit={onSubmit}>
        <h1>Welcome back</h1>
        <p className="sub">Sign in to continue your chats.</p>

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />

        {error && <p className="error" role="alert">{error}</p>}

        <button className="full" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="footer-note">
          No account? <Link href="/register">Create one</Link>
        </p>
      </form>
    </main>
  );
}
