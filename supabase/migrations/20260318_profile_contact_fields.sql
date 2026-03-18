-- Add contact fields to traveler_profiles
ALTER TABLE traveler_profiles ADD COLUMN IF NOT EXISTS home_city text;
ALTER TABLE traveler_profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE traveler_profiles ADD COLUMN IF NOT EXISTS email text;
