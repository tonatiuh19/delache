-- Align runtime settings with product decisions (2026-07-29)
-- - session TTL 30 days
-- - Spanish default locale (locked for new users)
-- - admin-configurable case number format

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`)
VALUES
  ('session_ttl_days', '30', 'Session token lifetime in days'),
  ('default_locale', 'es', 'Default UI locale for new users (browser ignored until user changes)'),
  ('login_allowed_roles', 'admin', 'Comma-separated roles allowed to request OTP login'),
  ('case_number_format', 'DEL-{YYYY}-{SEQ:4}', 'Case number template. Tokens: {YYYY} {YY} {MM} {SEQ:n}. Admin-configurable.'),
  ('case_number_next_seq', '1', 'Next sequence integer used when generating case numbers')
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `description` = VALUES(`description`);
