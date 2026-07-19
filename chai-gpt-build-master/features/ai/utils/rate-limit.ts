import { prisma } from "@/lib/db";

export const DAILY_PROMPT_LIMIT = 3;

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getRemainingPrompts(userId: string) {
  const usage = await prisma.promptUsage.findUnique({
    where: { userId_date: { userId, date: startOfToday() } },
  });

  const used = usage?.count ?? 0;
  return Math.max(DAILY_PROMPT_LIMIT - used, 0);
}

export async function consumePrompt(userId: string) {
  const date = startOfToday();

  const usage = await prisma.promptUsage.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (usage && usage.count >= DAILY_PROMPT_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  const updated = await prisma.promptUsage.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, count: 1 },
    update: { count: { increment: 1 } },
  });

  return { allowed: true, remaining: DAILY_PROMPT_LIMIT - updated.count };
}
