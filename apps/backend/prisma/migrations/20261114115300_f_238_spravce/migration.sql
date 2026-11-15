-- #238, ADR-0010: the administrator is a separate account with its own
-- BetterAuth instance and tables. The template's user.role decided nothing
-- and would be a second source of truth about who is an administrator.

-- AlterTable
ALTER TABLE "user" DROP COLUMN "role";

-- DropEnum
DROP TYPE "user_role";

-- CreateTable
CREATE TABLE "administrator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "administrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "admin_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "issuer" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "admin_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "admin_rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "administrator_email_key" ON "administrator"("email");

-- CreateIndex
CREATE INDEX "admin_session_userId_idx" ON "admin_session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_session_token_key" ON "admin_session"("token");

-- CreateIndex
CREATE INDEX "admin_account_userId_idx" ON "admin_account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_rate_limit_key_key" ON "admin_rate_limit"("key");

-- AddForeignKey
ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "administrator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_account" ADD CONSTRAINT "admin_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "administrator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

