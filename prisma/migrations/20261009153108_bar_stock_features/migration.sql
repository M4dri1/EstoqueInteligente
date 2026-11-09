-- AlterTable
ALTER TABLE "InventoryCount" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "depositCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emptyStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "returnable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetStock" INTEGER;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "emptiesOut" INTEGER;
