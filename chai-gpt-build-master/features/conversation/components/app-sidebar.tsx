"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GitBranchIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBranches,
  useConversations,
  useDeleteConversation,
  useUpdateConversation,
} from "@/features/conversation/hooks/use-conversation";
import { cn } from "@/lib/utils";

type Conversation = NonNullable<
  ReturnType<typeof useConversations>["data"]
>[number];

/**
 * Main application sidebar — logo, new chat, conversation list, theme toggle, and account.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { data: conversations, isLoading } = useConversations();

  // Get the active conversation id from the pathname (e.g. /c/123)
  // pathname.split("/")[2] is the third part of the pathname (the conversation id)
  //  firstparam = / , secondparam = c , thirdparam = 123
  const activeId = pathname.startsWith("/c/")
    ? pathname.split("/")[2]
    : undefined;

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="font-semibold tracking-tight"
              render={<Link href="/" />}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
                C
              </span>
              <span>ChaiGPT</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="New chat" render={<Link href="/" />}>
              <PlusIcon />
              <span>New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <ChatList
                conversations={conversations}
                isLoading={isLoading}
                activeId={activeId}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarFooterMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/** Renders the conversation list with loading skeletons or an empty-state message. */
function ChatList({
  conversations,
  isLoading,
  activeId,
}: {
  conversations: Conversation[] | undefined;
  isLoading: boolean;
  activeId: string | undefined;
}) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, index) => (
          <SidebarMenuItem key={index}>
            <Skeleton className="h-8 w-full" />
          </SidebarMenuItem>
        ))}
      </>
    );
  }

  if (!conversations?.length) {
    return (
      <p className="px-2 py-1.5 text-xs text-muted-foreground">No chats yet</p>
    );
  }

  return (
    <>
      {conversations.map((conversation) => (
        <ChatItem
          key={conversation.id}
          conversation={conversation}
          activeId={activeId}
        />
      ))}
    </>
  );
}

/** Single sidebar row for a conversation with rename, pin, delete, and nested branches. */
function ChatItem({
  conversation,
  activeId,
  depth = 0,
}: {
  conversation: Conversation;
  activeId: string | undefined;
  depth?: number;
}) {
  const isActive = activeId === conversation.id;
  const [showBranches, setShowBranches] = useState(false);
  const { data: branches } = useBranches(conversation.id);
  const updateConversation = useUpdateConversation();
  const deleteConversation = useDeleteConversation(
    isActive ? conversation.id : undefined,
  );

  /** Prompts the user to rename the conversation and persists the new title. */
  function handleRename() {
    const next = window.prompt("Rename chat", conversation.title);
    if (!next || next.trim() === conversation.title) return;
    updateConversation.mutate({ id: conversation.id, title: next });
  }

  return (
    <>
      <SidebarMenuItem style={depth ? { paddingLeft: depth * 12 } : undefined}>
        <SidebarMenuButton
          isActive={isActive}
          tooltip={conversation.title}
          render={<Link href={`/c/${conversation.id}`} />}
          className={cn(isActive && "font-medium")}
        >
          {branches?.length ? (
            <span
              role="button"
              aria-label={
                showBranches ? "Collapse branches" : "Expand branches"
              }
              className="flex size-4 shrink-0 items-center justify-center"
              onClick={(event) => {
                event.preventDefault();
                setShowBranches((current) => !current);
              }}
            >
              {showBranches ? (
                <ChevronDownIcon className="size-3.5" />
              ) : (
                <ChevronRightIcon className="size-3.5" />
              )}
            </span>
          ) : depth > 0 ? (
            <GitBranchIcon className="size-3.5 shrink-0 text-muted-foreground" />
          ) : null}
          <span className="truncate">{conversation.title}</span>
        </SidebarMenuButton>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuAction
                showOnHover
                className="data-popup-open:bg-sidebar-accent"
              />
            }
          >
            <MoreHorizontalIcon />
            <span className="sr-only">Chat actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem onClick={handleRename}>
              <PencilIcon />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                updateConversation.mutate({
                  id: conversation.id,
                  isPinned: !conversation.isPinned,
                })
              }
            >
              {conversation.isPinned ? <PinOffIcon /> : <PinIcon />}
              {conversation.isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => deleteConversation.mutate(conversation.id)}
            >
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {showBranches
        ? branches?.map((branch) => (
            <ChatItem
              key={branch.id}
              conversation={branch}
              activeId={activeId}
              depth={depth + 1}
            />
          ))
        : null}
    </>
  );
}

/** Footer menu with theme toggle and Clerk user account button. */
function SidebarFooterMenu() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          Toggle theme
        </Button>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8",
              },
            }}
          />
          <span className="truncate text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
            Account
          </span>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
