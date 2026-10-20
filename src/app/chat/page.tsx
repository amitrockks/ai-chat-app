import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ChatUI from "@/components/ChatUI";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <ChatUI userName={session.user.name ?? session.user.email ?? "You"} />;
}
