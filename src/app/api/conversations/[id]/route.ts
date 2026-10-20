import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true },
      },
    },
  });
  if (!conversation) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ conversation });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await prisma.conversation.deleteMany({ where: { id, userId } });
  if (result.count === 0) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}
