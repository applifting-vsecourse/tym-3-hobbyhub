-- #227, ADR-0026: přátelství uživatelů. Žádost o přátelství, symetrické
-- přátelství (jeden řádek na dvojici) a dva přepínače, co přátelé vidí.
-- Existující účty dostanou výchozí hodnoty přepínačů z DEFAULT.

-- CreateEnum
CREATE TYPE "friend_request_status" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "friendsSeeEventHistory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "friendsSeeUpcomingEvents" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "friend_request" (
    "id" TEXT NOT NULL,
    "status" "friend_request_status" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,

    CONSTRAINT "friend_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendship" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,

    CONSTRAINT "friendship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "friend_request_recipientId_status_idx" ON "friend_request"("recipientId", "status");

-- CreateIndex
CREATE INDEX "friend_request_senderId_idx" ON "friend_request"("senderId");

-- CreateIndex
CREATE INDEX "friendship_userBId_idx" ON "friendship"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "friendship_userAId_userBId_key" ON "friendship"("userAId", "userBId");

-- AddForeignKey
ALTER TABLE "friend_request" ADD CONSTRAINT "friend_request_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_request" ADD CONSTRAINT "friend_request_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Žádost sám sobě nedává smysl.
ALTER TABLE "friend_request" ADD CONSTRAINT "friend_request_not_self"
  CHECK ("senderId" <> "recipientId");

-- Datum vyřízení je vyplněné právě tehdy, když žádost už nečeká.
ALTER TABLE "friend_request" ADD CONSTRAINT "friend_request_decided_at"
  CHECK (("status" = 'PENDING') = ("decidedAt" IS NULL));

-- Nejvýš jedna čekající žádost pro dvojici, v obou směrech: hlídá i souběžné
-- odeslání a protižádost. Zamítnutá ani přijatá žádost novou neblokuje.
CREATE UNIQUE INDEX "friend_request_one_pending_per_pair"
  ON "friend_request"(LEAST("senderId", "recipientId"), GREATEST("senderId", "recipientId"))
  WHERE "status" = 'PENDING';

-- Přátelství je symetrické: dvojice se ukládá jednou, s menším id v userAId.
-- Spolu s jedinečností (userAId, userBId) to znamená nejvýš jedno přátelství
-- pro dvojici a nikdy přátelství sám se sebou. COLLATE "C" porovnává po bajtech,
-- stejně jako `friendPairOf` v aplikaci, nezávisle na collation databáze.
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_ordered_pair"
  CHECK ("userAId" COLLATE "C" < "userBId" COLLATE "C");
