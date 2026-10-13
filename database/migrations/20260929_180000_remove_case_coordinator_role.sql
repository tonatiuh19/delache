-- Remove staff login role case_coordinator (Miro Coordinador = admin).
-- Keep assignment_role 'coordinator' and cases.assigned_coordinator_id.

UPDATE staff_users
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE role = 'case_coordinator' AND deleted_at IS NULL;

UPDATE system_settings
SET setting_value = 'admin,expert,legal,logistics,accountant',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'login_allowed_roles'
  AND setting_value LIKE '%case_coordinator%';

ALTER TABLE staff_users
  MODIFY COLUMN `role` enum(
    'admin',
    'expert',
    'legal',
    'logistics',
    'accountant'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'expert';
