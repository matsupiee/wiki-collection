-- Keep the purchase table in place because deposits reference its primary key.
ALTER TABLE coin_purchase RENAME COLUMN amount TO old_amount;--> statement-breakpoint
ALTER TABLE coin_purchase RENAME COLUMN currency TO old_currency;--> statement-breakpoint
ALTER TABLE coin_purchase ADD COLUMN amount integer;--> statement-breakpoint
ALTER TABLE coin_purchase ADD COLUMN currency text;--> statement-breakpoint
-- Mock purchases never involved a payment. Preserve historical payment records.
UPDATE coin_purchase SET amount = old_amount, currency = old_currency WHERE provider <> 'mock';--> statement-breakpoint
ALTER TABLE coin_purchase DROP COLUMN old_amount;--> statement-breakpoint
ALTER TABLE coin_purchase DROP COLUMN old_currency;--> statement-breakpoint
ALTER TABLE coin_product DROP COLUMN price_amount;--> statement-breakpoint
ALTER TABLE coin_product DROP COLUMN currency;
