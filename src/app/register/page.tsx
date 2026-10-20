"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create account.");
      setLoading(false);
      return;
    }

    // Sign the new user in straight away
    const login = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (login?.error) {
      window.location.href = "/login";
      return;
    }
    window.location.href = "/chat";
  }

  return (
    <main className="center-page">
      <form className="card" onSubmit={onSubmit}>
        <h1>Create your account</h1>
        <p className="sub">It only takes a moment.</p>

        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" autoComplete="name" required maxLength={80} />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />

        <label htmlFor="password">Password (min 8 characters)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />

        {error && <p className="error" role="alert">{error}</p>}

        <button className="full" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
        <p className="footer-note">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
