-- CreateTable
CREATE TABLE "HarvestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "notes" TEXT,
    "hours" REAL NOT NULL,
    "spentDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "HarvestLog_externalId_key" ON "HarvestLog"("externalId");
