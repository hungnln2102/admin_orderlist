-- Column linking (linked_wallet_id) is no longer used; each wallet column is independent.
UPDATE finance.master_wallettypes
SET linked_wallet_id = NULL
WHERE linked_wallet_id IS NOT NULL;
