"use server";

import { isTextUIPart, type UIMessage } from "ai";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Extracts plain text from an AI SDK `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

/**
 * Normalizes stored message parts from the database into AI SDK `UIMessage` parts.
 * Falls back to a single text part when no structured parts are stored.
 */
function toUIMessageParts(
  parts: Prisma.JsonValue | null,
  content: string,
): UIMessage["parts"] {
  const stored = parts as UIMessage["parts"] | null;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  return [{ type: "text", text: content }];
}

type ConversationChainLink = {
  conversationId: string;
  branchPointCreatedAt: Date | null;
};

const conversationChainSelect = {
  id: true,
  parentConversationId: true,
  branchPointMessage: { select: { createdAt: true } },
} satisfies Prisma.ConversationSelect;

type ConversationChainRow = Prisma.ConversationGetPayload<{
  select: typeof conversationChainSelect;
}>;

async function getConversationChain(
  conversationId: string,
): Promise<ConversationChainLink[]> {
  const chain: ConversationChainLink[] = [];
  let currentConversationId: string | null = conversationId;

  while (currentConversationId) {
    const conversation: ConversationChainRow =
      await prisma.conversation.findUniqueOrThrow({
        where: { id: currentConversationId },
        select: conversationChainSelect,
      });

    chain.unshift({
      conversationId: conversation.id,
      branchPointCreatedAt: conversation.branchPointMessage?.createdAt ?? null,
    });
    currentConversationId = conversation.parentConversationId;
  }

  return chain;
}

/**
 * Loads all messages for a conversation from the database as AI SDK `UIMessage`s.
 * When the conversation is a branch, shared history is inherited from its
 * ancestors up to the message it branched from, then its own messages continue.
 *
 * @param conversationId - The conversation whose messages to load.
 * @returns Messages ordered oldest to newest, ready for `useChat`.
 */
export async function loadChatMessages(
  conversationId: string,
): Promise<UIMessage[]> {
  const chain = await getConversationChain(conversationId);

  const rows = (
    await Promise.all(
      chain.map((link, index) => {
        const nextLink = chain[index + 1];
        return prisma.message.findMany({
          where: {
            conversationId: link.conversationId,
            ...(nextLink
              ? { createdAt: { lte: nextLink.branchPointCreatedAt! } }
              : {}),
          },
          orderBy: { createdAt: "asc" },
        });
      }),
    )
  ).flat();

  return rows.map((row) => ({
    id: row.id,
    role: row.role === "ASSISTANT" ? "assistant" : "user",
    parts: toUIMessageParts(row.parts, row.content),
  }));
}

type SaveChatMessagesOptions = {
  updateTitle?: boolean;
};

/**
 * Upserts AI SDK `UIMessage`s into the database for a conversation.
 *
 * @param conversationId - Target conversation ID.
 * @param messages - Messages to persist (system messages are skipped).
 * @param options.updateTitle - When true, auto-titles "New Chat" from the first user message.
 */
export async function saveChatMessages(
  conversationId: string,
  messages: UIMessage[],
  options: SaveChatMessagesOptions = {},
) {
  const { updateTitle = true } = options;

  for (const message of messages) {
    if (message.role === "system") continue;

    const content = getMessageText(message);
    const role = message.role === "assistant" ? "ASSISTANT" : "USER";

    await prisma.message.upsert({
      where: { id: message.id },
      create: {
        id: message.id,
        conversationId,
        role,
        status: "COMPLETE",
        content,
        parts: message.parts as Prisma.InputJsonValue,
      },
      update: {
        content,
        parts: message.parts as Prisma.InputJsonValue,
        status: "COMPLETE",
      },
    });
  }

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: { title: true },
  });

  const firstUser = messages.find((message) => message.role === "user");
  const firstUserText = firstUser ? getMessageText(firstUser).trim() : "";

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      title:
        updateTitle && conversation.title === "New Chat" && firstUserText
          ? firstUserText.slice(0, 48)
          : conversation.title,
    },
  });
}
