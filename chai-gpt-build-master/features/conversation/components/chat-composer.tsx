"use client";

import * as React from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
  onSend: (content: string) => Promise<void> | void;
  onStop?: () => void;
  isSending?: boolean;
  remainingPrompts?: number;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

/**
 * Message input form with send button. Enter sends; Shift+Enter inserts a newline.
 */
export function ChatComposer({
  onSend,
  onStop,
  isSending = false,
  remainingPrompts,
  placeholder = "Message ChaiGPT…",
  className,
  autoFocus = false,
}: ChatComposerProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const limitReached = remainingPrompts === 0;
  const disabled = isSending || limitReached;

  React.useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  /** Submits the current message when the form is submitted or Enter is pressed. */
  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const content = value.trim();
    if (!content || disabled) return;

    setValue("");
    await onSend(content);
    textareaRef.current?.focus();
  }

  /** Handles keyboard shortcuts — Enter to send, Shift+Enter for a new line. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className={cn("mx-auto w-full max-w-3xl px-4 pb-4 md:px-6", className)}
    >
      <InputGroup className="h-auto min-h-14 rounded-3xl border-border/80 bg-background shadow-sm dark:bg-input/40">
        <InputGroupTextarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={limitReached ? "Daily limit reached" : placeholder}
          disabled={disabled}
          rows={1}
          className="max-h-48 min-h-12 py-3.5 pl-4 text-[15px] leading-relaxed"
        />
        <InputGroupAddon align="inline-end" className="pr-2 pb-2 self-end">
          <InputGroupButton
            type={isSending ? "button" : "submit"}
            size="icon-sm"
            variant="default"
            disabled={isSending ? !onStop : !canSend}
            onClick={isSending ? onStop : undefined}
            className="size-9 rounded-full"
            aria-label={isSending ? "Stop generating" : "Send message"}
          >
            {isSending ? <SquareIcon className="size-3.5" /> : <ArrowUpIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {limitReached
          ? "Daily limit reached — try again tomorrow."
          : remainingPrompts !== undefined
            ? `${remainingPrompts} prompt${remainingPrompts === 1 ? "" : "s"} left today.`
            : "ChaiGPT can make mistakes. Check important info."}
      </p>
    </form>
  );
}
