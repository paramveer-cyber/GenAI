"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** Shape of a conversation row returned in the sidebar list. */
export type ConversationListItem = {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Verifies that a conversation exists and belongs to the given user.
 *
 * @throws {Error} When the conversation is not found or not owned by the user.
 */
async function assertOwnsConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

/**
 * Fetches a single conversation owned by the current user.
 *
 * @param conversationId - The conversation to load.
 * @throws {Error} When the conversation is not found.
 */
export async function getConversation(conversationId: string) {
  const user = await requireUser();
  return assertOwnsConversation(conversationId, user.id);
}

/**
 * Lists non-archived conversations for the current user.
 * Pinned conversations appear first, then sorted by most recent activity.
 */
export async function listConversations(): Promise<ConversationListItem[]> {
  const user = await requireUser();

  return prisma.conversation.findMany({
    where: { userId: user.id, isArchived: false, parentConversationId: null },
    orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
    select: {
      id: true,
      title: true,
      isPinned: true,
      isArchived: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Creates a new conversation for the current user.
 *
 * @param title - Optional title; defaults to "New Chat".
 */
export async function createConversation(title = "New Chat") {
  const user = await requireUser();

  return prisma.conversation.create({
    data: {
      userId: user.id,
      title: title.trim() || "New Chat",
    },
  });
}

/**
 * Updates conversation metadata (title, pin, or archive status).
 *
 * @param conversationId - The conversation to update.
 * @param data - Fields to change; omitted fields are left unchanged.
 */
export async function updateConversation(
  conversationId: string,
  data: { title?: string; isPinned?: boolean; isArchived?: boolean },
) {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id);

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...(data.title !== undefined
        ? { title: data.title.trim() || "New Chat" }
        : {}),
      ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
      ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
    },
  });

  revalidatePath("/");
  revalidatePath(`/c/${conversationId}`);
  return conversation;
}

/**
 * Permanently deletes a conversation owned by the current user.
 *
 * @param conversationId - The conversation to delete.
 * @returns The deleted conversation ID.
 */
export async function deleteConversation(conversationId: string) {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id);

  await prisma.conversation.delete({
    where: { id: conversationId },
  });

  revalidatePath("/");
  return { id: conversationId };
}

export async function createBranch(messageId: string, title?: string) {
  const user = await requireUser();

  const branchPointMessage = await prisma.message.findFirst({
    where: { id: messageId, conversation: { userId: user.id } },
    include: { conversation: true },
  });

  if (!branchPointMessage) {
    throw new Error("Message not found");
  }

  const branch = await prisma.conversation.create({
    data: {
      userId: user.id,
      title:
        title?.trim() || `${branchPointMessage.conversation.title} (branch)`,
      model: branchPointMessage.conversation.model,
      systemPrompt: branchPointMessage.conversation.systemPrompt,
      parentConversationId: branchPointMessage.conversationId,
      branchPointMessageId: branchPointMessage.id,
    },
  });

  revalidatePath(`/c/${branchPointMessage.conversationId}`);
  revalidatePath(`/c/${branch.id}`);
  return branch;
}

export async function listBranches(
  conversationId: string,
): Promise<ConversationListItem[]> {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id);

  return prisma.conversation.findMany({
    where: { parentConversationId: conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      isPinned: true,
      isArchived: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
