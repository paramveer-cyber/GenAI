import { loadChatMessages } from "@/features/ai/actions/chat-store";
import { getRemainingPrompts } from "@/features/ai/utils/rate-limit";
import { getConversation } from "@/features/conversation/actions/conversation-actions";
import { ConversationView } from "@/features/conversation/components/conversation-view";
import { requireUser } from "@/features/auth/action/require-user";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

type ConversationPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ConversationPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const conversation = await getConversation(id);
    return { title: `${conversation.title} · ChaiGPT` };
  } catch (error) {
    return { title: "ChaiGPT" };
  }
}

/**
 * Conversation page — loads messages and renders the chat UI for a given ID.
 */
const page = async ({ params }: ConversationPageProps) => {
  const { id } = await params;

  try {
    await getConversation(id);
  } catch (error) {
    notFound();
  }

  const initialMessages = await loadChatMessages(id);
  const user = await requireUser();
  const remainingPrompts = await getRemainingPrompts(user.id);

  return (
    <ConversationView
      key={id}
      conversationId={id}
      initialMessages={initialMessages}
      remainingPrompts={remainingPrompts}
    />
  );
};

export default page;
