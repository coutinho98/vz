-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'card',
ALTER COLUMN "cardLast4" DROP NOT NULL;
