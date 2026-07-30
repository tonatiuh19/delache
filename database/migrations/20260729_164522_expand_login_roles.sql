-- Expand login to internal staff + law firm portal users
-- TiDB Cloud Serverless (MySQL 8.0 compatible)

UPDATE `system_settings`
SET `setting_value` = 'admin,case_coordinator,expert,legal,logistics,accountant,law_firm_user',
    `description` = 'Comma-separated roles allowed to request OTP login'
WHERE `setting_key` = 'login_allowed_roles';
