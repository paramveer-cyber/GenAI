"use client";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import React, { useMemo, useState } from "react";
import { useConversations } from "../hooks/use-conversation";
import { useDeleteMessagesFrom } from "@/features/messages/hooks/use-messages";
import { queryKeys } from "../utils/query-keys";
import { toast } from "sonner";
import { ChatEmpty } from "./chat-empty";
import { ChatMessages } from "./chat-messages";
import { ChatComposer } from "./chat-composer";

type ConversationViewProps = {
  conversationId: string;
  initialMessages: UIMessage[];
  remainingPrompts: number;
};

/**
 * Main chat view — header, message list (or empty state), and composer with streaming.
 */
export const ConversationView = ({
  conversationId,
  initialMessages,
  remainingPrompts,
}: ConversationViewProps) => {
  const queryClient = useQueryClient();
  const { data: conversations } = useConversations();
  const [remaining, setRemaining] = useState(remainingPrompts);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: {
            id,
            message: messages.at(-1),
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, regenerate, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onFinish: () => {
      setRemaining((count) => Math.max(count - 1, 0));
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const deleteMessagesFrom = useDeleteMessagesFrom(conversationId);

  async function handleRegenerateMessage(messageId: string) {
    await deleteMessagesFrom.mutateAsync(messageId);
    void regenerate({ messageId });
  }

  async function handleEditMessage(messageId: string, currentText: string) {
    const nextText = window.prompt("Edit message", currentText);
    if (!nextText || nextText.trim() === currentText.trim()) return;

    await deleteMessagesFrom.mutateAsync(messageId);
    void sendMessage({ text: nextText.trim(), messageId });
  }

  const title =
    conversations?.find((item) => item.id === conversationId)?.title ?? "Chat";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mx-1 h-4" />
        <h1 className="truncate text-sm font-medium tracking-tight">{title}</h1>
      </header>

      {messages.length === 0 ? (
        <ChatEmpty />
      ) : (
        <ChatMessages
          messages={messages}
          status={status}
          onRegenerateMessage={handleRegenerateMessage}
          onEditMessage={handleEditMessage}
        />
      )}

      <ChatComposer
        onSend={(text) => {
          void sendMessage({ text });
        }}
        onStop={() => void stop()}
        isSending={status !== "ready"}
        remainingPrompts={remaining}
        autoFocus
      />
    </div>
  );
};
