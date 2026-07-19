import { isTextUIPart, type UIMessage } from "ai";

export function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}
