INSERT INTO providers (code, name, adapter_key, status, enabled)
SELECT 'SDR', 'SoftAPI', 'softapi', 'active', 1
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE code = 'SDR' LIMIT 1
);
