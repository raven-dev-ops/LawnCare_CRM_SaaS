-- Add name column to routes for display and tracking
ALTER TABLE routes
  ADD COLUMN name TEXT;

-- Backfill existing routes with a friendly default
UPDATE routes
SET name = day_of_week || ' Route'
WHERE name IS NULL;
