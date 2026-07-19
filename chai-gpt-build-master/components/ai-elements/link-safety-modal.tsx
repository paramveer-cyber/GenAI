"use client";

import { ExternalLinkIcon } from "lucide-react";
import type { LinkSafetyModalProps } from "streamdown";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LinkSafetyModal({
  url,
  isOpen,
  onClose,
  onConfirm,
}: LinkSafetyModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLinkIcon className="size-5" />
            Open external link
          </DialogTitle>
          <DialogDescription>
            This link leads outside ChaiGPT. Make sure you trust it before
            continuing.
          </DialogDescription>
        </DialogHeader>
        <p className="break-all rounded-md bg-muted p-3 font-mono text-sm">
          {url}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <ExternalLinkIcon className="size-4" />
            Open link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
