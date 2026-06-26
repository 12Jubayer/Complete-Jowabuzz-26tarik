-- Permanent Oracle/FC provider player username (separate from login phone and internal id)
ALTER TABLE users
  ADD COLUMN provider_username VARCHAR(64) NULL AFTER phone;
