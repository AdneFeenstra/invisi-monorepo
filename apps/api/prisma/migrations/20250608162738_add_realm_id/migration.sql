/*
  Warnings:

  - Added the required column `realmId` to the `QuickBooksConnection` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuickBooksConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "realmId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_QuickBooksConnection" ("accessToken", "expiresAt", "id", "refreshToken", "userId") SELECT "accessToken", "expiresAt", "id", "refreshToken", "userId" FROM "QuickBooksConnection";
DROP TABLE "QuickBooksConnection";
ALTER TABLE "new_QuickBooksConnection" RENAME TO "QuickBooksConnection";
CREATE UNIQUE INDEX "QuickBooksConnection_userId_key" ON "QuickBooksConnection"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
