"use client";

import { useEffect } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangleIcon />
          </EmptyMedia>
          <EmptyTitle className="text-2xl tracking-tight">
            Something went wrong
          </EmptyTitle>
          <EmptyDescription>
            {error.message || "An unexpected error occurred."}
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </Empty>
    </div>
  );
}
