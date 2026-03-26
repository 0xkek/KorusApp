-- Add shoutout transaction signature column
ALTER TABLE "posts" ADD COLUMN "shoutoutTxSignature" VARCHAR(128);
