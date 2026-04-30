-- Legacy: column_total used record_date 1900-01-01. New model stores per calendar date like other columns.
DELETE FROM finance.trans_dailybalances
WHERE record_date = DATE '1900-01-01';
