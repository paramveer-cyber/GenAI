-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "parentConversationId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "branchPointMessageId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_parentConversationId_idx" ON "Conversation"("parentConversationId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_parentConversationId_fkey" FOREIGN KEY ("parentConversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_branchPointMessageId_fkey" FOREIGN KEY ("branchPointMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;