-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'GENERATION', 'REFUND', 'BONUS');

-- CreateEnum
CREATE TYPE "GenerationType" AS ENUM ('TEXT_TO_3D_PREVIEW', 'TEXT_TO_3D_REFINE', 'IMAGE_TO_3D', 'MULTI_IMAGE_TO_3D', 'REMESH', 'RETEXTURE');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'PRINTING', 'QUALITY_CHECK', 'SHIPPING', 'DELIVERED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PrintMaterial" AS ENUM ('PLA', 'PETG', 'ABS', 'RESIN', 'RESIN_TOUGH');

-- CreateEnum
CREATE TYPE "PrintSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'XL', 'CUSTOM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "meshyTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "priceUsd" INTEGER NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "meshyTaskId" TEXT NOT NULL,
    "meshyTaskType" "GenerationType" NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "prompt" TEXT,
    "imageUrl" TEXT,
    "imageUrls" TEXT[],
    "aiModel" TEXT NOT NULL DEFAULT 'latest',
    "artStyle" TEXT,
    "topology" TEXT NOT NULL DEFAULT 'triangle',
    "targetPolycount" INTEGER NOT NULL DEFAULT 30000,
    "enablePbr" BOOLEAN NOT NULL DEFAULT false,
    "modelUrls" JSONB,
    "textureUrls" JSONB,
    "thumbnailUrl" TEXT,
    "localModelPath" TEXT,
    "localThumbPath" TEXT,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "refinedFromId" TEXT,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rigging" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "meshyTaskId" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "heightMeters" DOUBLE PRECISION NOT NULL DEFAULT 1.7,
    "modelUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Rigging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animation" (
    "id" TEXT NOT NULL,
    "riggingId" TEXT NOT NULL,
    "meshyTaskId" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "actionId" INTEGER NOT NULL,
    "actionName" TEXT NOT NULL,
    "modelUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Animation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "material" "PrintMaterial" NOT NULL,
    "size" "PrintSize" NOT NULL,
    "color" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "basePrice" INTEGER NOT NULL,
    "materialUpcharge" INTEGER NOT NULL DEFAULT 0,
    "sizeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "shipping" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripePaymentStatus" TEXT,
    "shippingName" TEXT,
    "shippingAddress" JSONB,
    "trackingNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "printedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "PrintOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPackage_stripePriceId_key" ON "CreditPackage"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "Generation_meshyTaskId_key" ON "Generation"("meshyTaskId");

-- CreateIndex
CREATE INDEX "Generation_userId_idx" ON "Generation"("userId");

-- CreateIndex
CREATE INDEX "Generation_meshyTaskId_idx" ON "Generation"("meshyTaskId");

-- CreateIndex
CREATE INDEX "Generation_status_idx" ON "Generation"("status");

-- CreateIndex
CREATE INDEX "Generation_createdAt_idx" ON "Generation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Rigging_generationId_key" ON "Rigging"("generationId");

-- CreateIndex
CREATE UNIQUE INDEX "Rigging_meshyTaskId_key" ON "Rigging"("meshyTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "Animation_meshyTaskId_key" ON "Animation"("meshyTaskId");

-- CreateIndex
CREATE INDEX "Animation_riggingId_idx" ON "Animation"("riggingId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintOrder_orderNumber_key" ON "PrintOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "PrintOrder_userId_idx" ON "PrintOrder"("userId");

-- CreateIndex
CREATE INDEX "PrintOrder_status_idx" ON "PrintOrder"("status");

-- CreateIndex
CREATE INDEX "PrintOrder_orderNumber_idx" ON "PrintOrder"("orderNumber");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_refinedFromId_fkey" FOREIGN KEY ("refinedFromId") REFERENCES "Generation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rigging" ADD CONSTRAINT "Rigging_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animation" ADD CONSTRAINT "Animation_riggingId_fkey" FOREIGN KEY ("riggingId") REFERENCES "Rigging"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintOrder" ADD CONSTRAINT "PrintOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintOrder" ADD CONSTRAINT "PrintOrder_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
