/*
  Warnings:

  - You are about to drop the column `issuer` on the `account` table. All the data in the column will be lost.

*/
-- better-auth 1.7.3+ matches accounts on (providerId, accountId) again and no
-- longer writes `issuer`, so the column added for 1.7.0–1.7.2 is dead.
-- AlterTable
ALTER TABLE "account" DROP COLUMN "issuer";
