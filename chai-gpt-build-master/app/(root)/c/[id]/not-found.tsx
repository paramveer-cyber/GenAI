import Link from "next/link";
import { MessageSquareOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ConversationNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquareOffIcon />
          </EmptyMedia>
          <EmptyTitle className="text-2xl tracking-tight">
            Chat not found
          </EmptyTitle>
          <EmptyDescription>
            This chat doesn&apos;t exist or you don&apos;t have access to it.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" render={<Link href="/" />}>
          Start a new chat
        </Button>
      </Empty>
    </div>
  );
}
