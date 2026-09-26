-- CreateEnum
CREATE TYPE "WebLeadType" AS ENUM ('RESERVATION', 'APPOINTMENT', 'CONTACT');

-- CreateEnum
CREATE TYPE "WebLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'DISCARDED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "description" TEXT,
ADD COLUMN     "showOnline" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "openingHours" TEXT,
ADD COLUMN     "siteHeadline" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "web_leads" (
    "id" TEXT NOT NULL,
    "type" "WebLeadType" NOT NULL,
    "status" "WebLeadStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT,
    "preferredDate" TIMESTAMP(3),
    "preferredTime" TEXT,
    "service" TEXT,
    "items" JSONB,
    "total" DOUBLE PRECISION,
    "customerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "web_leads_status_idx" ON "web_leads"("status");

-- CreateIndex
CREATE INDEX "web_leads_type_idx" ON "web_leads"("type");

-- CreateIndex
CREATE INDEX "web_leads_createdAt_idx" ON "web_leads"("createdAt");
