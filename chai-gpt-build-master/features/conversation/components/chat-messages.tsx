"use client";

import type { ChatStatus, UIMessage } from "ai";
import { CopyIcon, GitBranchPlusIcon, PencilIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageActions,
  MessageAction,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { useCreateBranch } from "@/features/conversation/hooks/use-conversation";
import { getMessageText } from "@/features/messages/utils/message-text";
import {
  WebSearchToolCall,
  type WebSearchToolPart,
} from "./web-search-tool-call";

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
  onRegenerateMessage: (messageId: string) => void;
  onEditMessage: (messageId: string, currentText: string) => void;
};

function MessageParts({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return <MessageResponse key={index}>{part.text}</MessageResponse>;
        }
        if (part.type === "tool-webSearch") {
          const searchPart = part as unknown as WebSearchToolPart;
          return (
            <WebSearchToolCall key={searchPart.toolCallId} part={searchPart} />
          );
        }
        return null;
      })}
    </>
  );
}

/**
 * Renders the conversation message list with markdown responses and a loading indicator.
 */
export function ChatMessages({
  messages,
  status,
  onRegenerateMessage,
  onEditMessage,
}: ChatMessagesProps) {
  const isWaiting = status === "submitted" && messages.at(-1)?.role === "user";
  const isStreaming = status !== "ready";
  const createBranch = useCreateBranch();

  function handleCopy(messageText: string) {
    void navigator.clipboard.writeText(messageText);
    toast.success("Copied to clipboard");
  }

  return (
    <Conversation>
      <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
        {messages.map((message) => {
          const messageText = getMessageText(message);

          return (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                <MessageParts message={message} />
              </MessageContent>
              <MessageActions className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                <MessageAction
                  tooltip="Copy"
                  onClick={() => handleCopy(messageText)}
                >
                  <CopyIcon className="size-3.5" />
                </MessageAction>
                {message.role === "user" ? (
                  <MessageAction
                    tooltip="Edit"
                    disabled={isStreaming}
                    onClick={() => onEditMessage(message.id, messageText)}
                  >
                    <PencilIcon className="size-3.5" />
                  </MessageAction>
                ) : null}
                {message.role === "assistant" ? (
                  <MessageAction
                    tooltip="Regenerate"
                    disabled={isStreaming}
                    onClick={() => onRegenerateMessage(message.id)}
                  >
                    <RotateCcwIcon className="size-3.5" />
                  </MessageAction>
                ) : null}
                <MessageAction
                  tooltip="Branch from here"
                  onClick={() => createBranch.mutate(message.id)}
                >
                  <GitBranchPlusIcon className="size-3.5" />
                </MessageAction>
              </MessageActions>
            </Message>
          );
        })}

        {isWaiting ? (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>
    </Conversation>
  );
}
