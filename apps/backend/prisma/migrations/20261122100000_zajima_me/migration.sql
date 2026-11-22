-- #231, ADR-0030: akce uložené na seznam „Zajímá mě“. Jedna akce u jednoho
-- člověka nejvýš jednou; zmizí s akcí i s uživatelem. #232 sem přidá příznak
-- hlídání volného místa.

-- CreateTable
CREATE TABLE "event_interest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "event_interest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_interest_eventId_idx" ON "event_interest"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_interest_userId_eventId_key" ON "event_interest"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "event_interest" ADD CONSTRAINT "event_interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_interest" ADD CONSTRAINT "event_interest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
