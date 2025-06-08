/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `ClickUpConnection` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `ClickUpConnection` table. All the data in the column will be lost.
  - Added the required column `workspaceName` to the `ClickUpConnection` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClickUpConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workspaceName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ClickUpConnection" ("accessToken", "createdAt", "id", "tokenType", "userId", "workspaceId") SELECT "accessToken", "createdAt", "id", "tokenType", "userId", "workspaceId" FROM "ClickUpConnection";
DROP TABLE "ClickUpConnection";
ALTER TABLE "new_ClickUpConnection" RENAME TO "ClickUpConnection";
CREATE UNIQUE INDEX "ClickUpConnection_userId_key" ON "ClickUpConnection"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
