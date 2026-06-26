INSERT INTO site_settings (setting_key, setting_value)
SELECT 'jowabuzz_app_download', JSON_OBJECT(
  'version', '1.0.0',
  'apkUrl', '/downloads/jowabuzz-app.apk',
  'appSize', '',
  'releaseNotes', 'Initial release of Jowabuzz Mobile App.',
  'isActive', false,
  'hasApk', false,
  'filename', 'jowabuzz-app.apk',
  'updatedAt', NULL
)
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings WHERE setting_key = 'jowabuzz_app_download'
)
