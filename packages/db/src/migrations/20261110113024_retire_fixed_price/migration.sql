UPDATE user_card
SET status = 'owned'
WHERE status = 'listed' AND EXISTS (
  SELECT 1 FROM market_listing
  WHERE user_card_id = user_card.id AND seller_id = user_card.user_id
    AND format = 'fixed_price' AND status = 'active'
);
--> statement-breakpoint
UPDATE market_listing SET status = 'cancelled', updated_at = cast(unixepoch('subsecond') * 1000 as integer)
WHERE format = 'fixed_price' AND status = 'active';
