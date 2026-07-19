import {
  loadChatMessages,
  saveChatMessages,
} from "@/features/ai/actions/chat-store";
import { getChatModel } from "@/features/ai/utils/model";
import { webSearchTool } from "@/features/ai/utils/web-search-tool";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
/**
 * POST /api/chat — Streams an AI assistant reply for a conversation.
 *
 * Validates auth and ownership, persists the user message, then streams the
 * assistant response via the AI SDK. Final messages are saved when the stream ends.
 */
export async function POST(req: Request) {
  await auth.protect();

  let message: UIMessage;
  let id: string;
  try {
    ({ message, id } = await req.json());
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  if (!message || !id) {
    return new Response("Missing message or conversation id", { status: 400 });
  }

  const user = await requireUser();

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  const previousMessages = await loadChatMessages(id);

  const alreadySaved = previousMessages.some(
    (storedMessage) => storedMessage.id === message.id,
  );

  const messages = alreadySaved
    ? previousMessages
    : [...previousMessages, message];

  if (!alreadySaved) {
    try {
      await saveChatMessages(id, [message]);
    } catch (error) {
      console.error(error);
      return new Response("Could not save message", { status: 500 });
    }
  }

  const today = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const result = streamText({
    model: getChatModel(conversation.model),
    system:
      conversation.systemPrompt ??
      `You are ChaiGpt, a helpful assistant. Today's date is ${today}. Use the webSearch tool whenever you need current or real-time information you would not otherwise know.`,
    messages: await convertToModelMessages(messages),
    tools: { webSearch: webSearchTool },
    stopWhen: stepCountIs(5),
  });
  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      onEnd: async ({ messages: finalMessages }) => {
        try {
          await saveChatMessages(id, finalMessages, { updateTitle: false });
        } catch (error) {
          console.error(error);
        }
      },
    }),
  });
}
