/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `HarvestConnection` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HarvestConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "tokenType" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_HarvestConnection" ("accessToken", "createdAt", "expiresAt", "id", "refreshToken", "scope", "tokenType", "userId") SELECT "accessToken", "createdAt", "expiresAt", "id", "refreshToken", "scope", "tokenType", "userId" FROM "HarvestConnection";
DROP TABLE "HarvestConnection";
ALTER TABLE "new_HarvestConnection" RENAME TO "HarvestConnection";
CREATE UNIQUE INDEX "HarvestConnection_userId_key" ON "HarvestConnection"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
