# ChaiGPT

Streaming AI chat application built on Next.js 16, React 19, and the Vercel AI SDK.
Conversations persist to Postgres via Prisma, support branching mid-thread, and
stream assistant replies token by token with optional web search grounding.

---

## Links

- Deployed link : [ChaiGPT](https://chaigptrefined.vercel.app/)
- Demo vid : [Link](https://youtu.be/SY_hG8KibE4)

---

## Tech Stack

```
+---------------------+---------------------+---------------------+
| Frontend            | Backend             | Data Layer          |
+---------------------+---------------------+---------------------+
| Next.js 16 (App     | Next.js API Routes  | Prisma ORM 7        |
|   Router)           | Server Actions      | PostgreSQL          |
| React 19            | Clerk (auth)        |                     |
| TypeScript          | Vercel AI SDK       |                     |
| Tailwind CSS v4     | OpenAI provider     |                     |
| shadcn/ui + base-ui | Tavily (web search) |                     |
| TanStack Query      |                     |                     |
+---------------------+---------------------+---------------------+
```

---

## Folder Structure

```
chait-gpt-build/
|
|-- app/                          Next.js routes (App Router)
|   |-- (auth)/
|   |   `-- sign-in/              Clerk sign-in page + layout
|   |-- (root)/                   Authenticated route group
|   |   |-- layout.tsx            auth.protect() + onBoard() + ChatShell
|   |   |-- page.tsx              creates chat, redirects to /c/{id}
|   |   `-- c/[id]/
|   |       |-- page.tsx          loads conversation + messages
|   |       |-- loading.tsx
|   |       `-- not-found.tsx
|   |-- api/chat/route.ts         POST streaming chat endpoint
|   |-- layout.tsx                Clerk + QueryProvider + ThemeProvider
|   |-- error.tsx / global-error.tsx
|
|-- features/                     Feature-sliced domain logic
|   |-- ai/
|   |   |-- actions/chat-store.ts     load/save UIMessages, branch chains
|   |   `-- utils/                    model.ts, web-search-tool.ts
|   |-- auth/
|   |   `-- action/                   requireUser, onBoard
|   |-- conversation/
|   |   |-- actions/                  CRUD + branching for conversations
|   |   |-- components/               sidebar, shell, composer, messages
|   |   |-- hooks/                    TanStack Query hooks
|   |   `-- utils/query-keys.ts
|   |-- messages/
|   |   |-- actions/                  CRUD for individual messages
|   |   `-- hooks/
|   `-- home/
|       `-- actions/start-new-chat.ts
|
|-- components/
|   |-- ui/                       shadcn primitives (button, sidebar, ...)
|   |-- ai-elements/              chat-specific UI (message, loader, ...)
|   `-- providers/                query-provider, theme-provider
|
|-- prisma/
|   |-- schema.prisma
|   `-- migrations/
|
|-- lib/
|   |-- db.ts                     Prisma client singleton
|   |-- generated/prisma/         generated Prisma client (do not edit)
|   `-- utils.ts                  cn() class merge helper
|
`-- proxy.ts                      Clerk middleware, route matcher
```

---

## Layered Architecture

Strict one-way dependency chain. A layer only calls the layer directly below it.

```
+--------------+--------------+---------------+--------+----+
| Component    | Hook         | Server Action | Prisma | DB |
| (use client) | (use client) | (use server)  |        |    |
+--------------+--------------+---------------+--------+----+
```

Each layer calls only the one to its right.

```
Component   -> shadcn UI, lucide icons, cn() for classes
Hook        -> TanStack Query useQuery / useMutation
Server Action -> requireUser(), assertOwns*(), revalidatePath()
```

Rules:

- Components never import `prisma` or `lib/db` directly.
- Hooks never import `prisma` directly.
- Only files under `features/*/actions/*.ts` touch `prisma`.
- Every server action's first line is `const user = await requireUser()`.
- Any action taking an owned resource id calls a private `assertOwns*` helper.

---

## Data Model

```
+--------------------+-------------------------+--------------------+
| User               | Conversation            | Message            |
+--------------------+-------------------------+--------------------+
| id                 | id                      | id                 |
| clerkId            | userId                  | conversationId     |
| email              | title                   | role (enum)        |
| firstName          | model                   | status (enum)      |
| lastName           | systemPrompt            | content            |
| imageUrl           | isPinned / isArchived   | parts (json)       |
|                    | parentConversationId    | metadata (json)    |
|                    | branchPointMessageId    |                    |
|                    | lastMessageAt           |                    |
+--------------------+-------------------------+--------------------+

  User 1--* Conversation 1--* Message

  Conversation has a self relation (parent / branches) via
  parentConversationId, and points at the Message it branched from
  via branchPointMessageId.
```

`MessageRole`: `USER | ASSISTANT | SYSTEM | TOOL`
`MessageStatus`: `PENDING | COMPLETE | ERROR`

A conversation can branch off any prior message. The branch stores only
`parentConversationId` and `branchPointMessageId` — it does not copy messages.

---

## Request Flow: Sending a Chat Message

```
Browser             ConversationView    /api/chat route     OpenAI / Tavily     Postgres
|                   |                   |                   |                   |
+------------------->
  step 1: user presses Enter, sendMessage({ text })
|                   |                   |                   |                   |
                    +------------------->
  step 2: POST /api/chat  { id, message }
|                   |                   |                   |                   |
  step 3: auth.protect() / requireUser() / verify conversation ownership
|                   |                   |                   |                   |
                                        +--------------------------------------->
  step 4: loadChatMessages(id) + saveChatMessages([userMessage])
|                   |                   |                   |                   |
                                        +------------------->
  step 5: streamText(...)  (webSearch tool called if needed)
|                   |                   |                   |                   |
                    <---------------------------------------+
  step 6: UIMessage stream, tokens render live
|                   |                   |                   |                   |
                                        +--------------------------------------->
  step 7: onEnd: saveChatMessages(finalMessages)
|                   |                   |                   |                   |
  step 8: onFinish -> invalidate conversations query
```

---

## Request Flow: Opening a Conversation Page

```
GET /c/[id]
  |
  v
+------------------------------------------+
| app/(root)/layout.tsx                    |
|   auth.protect()                         |
|   onBoard() -- upsert User into Postgres |
+------------------------------------------+
  |
  v
+---------------------------------------+
| app/(root)/c/[id]/page.tsx            |
|   getConversation(id)                 |
|     -> requireUser()                  |
|     -> assertOwnsConversation         |
|   loadChatMessages(id)                |
|     -> walk parent chain              |
|     -> merge inherited + own messages |
+---------------------------------------+
  |
  |------------------------------+
  | conversation found            | not found / not owned
  v                               v
+------------------+     +---------------+
| ConversationView |     | not-found.tsx |
+------------------+     +---------------+
```

---

## Conversation Branching

Branching forks a new conversation from a specific message without copying data.
`loadChatMessages` reconstructs history by walking from the root ancestor down to
the target conversation, taking each ancestor's messages up to its own branch point.

```
Conversation A (root)
  msg 1 (user)
  msg 2 (assistant)
  msg 3 (user)          <-- branchPointMessageId for B
  msg 4 (assistant)
  msg 5 (user)

Conversation B  (parentConversationId = A, branchPointMessageId = msg 3)
  msg 6 (user)
  msg 7 (assistant)

loadChatMessages(B) resolves to:
  [ A.msg1, A.msg2, A.msg3, B.msg6, B.msg7 ]
```

---

## Auth Flow

```
Request
   |
   v
proxy.ts (clerkMiddleware)
   |
   |-- /sign-in(.*)  -----------------> public, no auth.protect()
   |
   `-- everything else
          |
          v
       auth.protect()  -- redirects to /sign-in if unauthenticated
          |
          v
   app/(root)/layout.tsx
          |
          |-- auth.protect()   (route-group level check)
          |-- onBoard()        upsert Clerk user into Postgres User table
          |
          v
   requireUser() in every server action
          |
          `-- looks up User by clerkId, throws if onboarding incomplete
```

---

## State Management

```
+--------------------------+------------------------------+
| Server state             | Ephemeral chat stream        |
| (TanStack Query)         | (useChat from @ai-sdk/react) |
+--------------------------+------------------------------+
| conversations.all        | messages (in-memory)         |
| conversations.detail(id) | status: submitted /          |
| conversations.branches   |   streaming / ready / error  |
| messages.byConversation  |                              |
+--------------------------+------------------------------+
```

When `useChat`'s `onFinish` callback fires, the sidebar's conversations query is
invalidated so the title and ordering refresh. Query keys are centralized in
`features/conversation/utils/query-keys.ts` — never inlined in a hook.

---

## Getting Started

```
bun install
cp .env.example .env        # fill in DATABASE_URL, CLERK keys, OPENAI_API_KEY, TAVILY_API_KEY
bunx prisma migrate dev
bun run dev
```

Required environment variables:

```
DATABASE_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
OPENAI_API_KEY
TAVILY_API_KEY
```

## Scripts

```
bun run dev      Start dev server
bun run build    Production build
bun run start    Start production server
bun run lint     Run ESLint
```
