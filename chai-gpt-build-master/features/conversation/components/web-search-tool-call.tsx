"use client";

import { ChevronDownIcon, GlobeIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader } from "@/components/ai-elements/loader";
import type { WebSearchOutput } from "@/features/ai/utils/web-search-tool";

type WebSearchToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

export type WebSearchToolPart = {
  toolCallId: string;
  state: WebSearchToolState;
  input?: { query: string };
  output?: WebSearchOutput;
  errorText?: string;
};

function WebSearchStatusBadge({ state }: { state: WebSearchToolState }) {
  if (state === "output-available") {
    return <Badge variant="secondary">Done</Badge>;
  }
  if (state === "output-error") {
    return <Badge variant="destructive">Failed</Badge>;
  }
  return <Badge variant="outline">Searching…</Badge>;
}

export function WebSearchToolCall({ part }: { part: WebSearchToolPart }) {
  const isRunning =
    part.state === "input-streaming" || part.state === "input-available";
  const query = part.input?.query ?? part.output?.query ?? "";
  const searchError = part.errorText ?? part.output?.error;

  return (
    <Collapsible className="w-full max-w-xl rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <GlobeIcon className="size-4 shrink-0" />
          <span className="truncate">
            {query ? `Searched the web: "${query}"` : "Searching the web"}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {isRunning ? (
            <Loader size={14} />
          ) : (
            <WebSearchStatusBadge state={part.state} />
          )}
          <ChevronDownIcon className="size-4" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {searchError ? (
          <p className="text-destructive">{searchError}</p>
        ) : (
          part.output?.results.map((result) => (
            <a
              key={result.url}
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border p-2 hover:bg-muted"
            >
              <p className="font-medium">{result.title}</p>
              <p className="line-clamp-2 text-muted-foreground">
                {result.content}
              </p>
            </a>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
