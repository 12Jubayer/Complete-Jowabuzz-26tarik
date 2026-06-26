INSERT INTO providers (code, name, adapter_key, status, enabled)
SELECT 'HMK', 'HMK Seamless', 'hmk', 'active', 1
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE code = 'HMK' LIMIT 1
);
