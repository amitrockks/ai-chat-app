import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/chat");

  return (
    <main className="center-page">
      <div className="hero">
        <h1>Chat with an AI assistant</h1>
        <p>Create an account to start conversations that are saved and ready when you return.</p>
        <div className="actions">
          <Link className="btn" href="/register">Create account</Link>
          <Link className="btn ghost" href="/login">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
