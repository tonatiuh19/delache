-- Split identity tables (athlete-hub style): staff vs law-firm portals
-- Same email may exist in BOTH tables independently.
-- TiDB Cloud Serverless (MySQL 8.0 compatible)

SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';

-- ---------------------------------------------------------------------------
-- 1) New identity + auth tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `staff_users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum(
    'admin',
    'case_coordinator',
    'expert',
    'legal',
    'logistics',
    'accountant'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'expert',
  `status` enum('active','inactive','suspended','invited') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'invited',
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preferred_language` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'es',
  `preferred_theme` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `timezone` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'America/Mexico_City',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_users_email` (`email`),
  UNIQUE KEY `uk_staff_users_public_uuid` (`public_uuid`),
  KEY `idx_staff_users_role` (`role`),
  KEY `idx_staff_users_status` (`status`),
  KEY `idx_staff_users_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_otp_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `staff_user_id` int unsigned NOT NULL,
  `code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` enum('email') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email',
  `purpose` enum('login','email_verify','invite') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'login',
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `max_attempts` tinyint unsigned NOT NULL DEFAULT '5',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff_otp_user` (`staff_user_id`),
  KEY `idx_staff_otp_expires` (`expires_at`),
  KEY `idx_staff_otp_lookup` (`staff_user_id`,`purpose`,`expires_at`),
  CONSTRAINT `fk_staff_otp_user` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `staff_user_id` int unsigned NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_sessions_token_hash` (`token_hash`),
  KEY `idx_staff_sessions_user` (`staff_user_id`),
  KEY `idx_staff_sessions_expires` (`expires_at`),
  KEY `idx_staff_sessions_active` (`staff_user_id`,`is_active`),
  CONSTRAINT `fk_staff_sessions_user` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `law_firm_users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','suspended','invited') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'invited',
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preferred_language` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'es',
  `preferred_theme` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `timezone` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'America/Mexico_City',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_law_firm_users_email` (`email`),
  UNIQUE KEY `uk_law_firm_users_public_uuid` (`public_uuid`),
  KEY `idx_law_firm_users_status` (`status`),
  KEY `idx_law_firm_users_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `law_firm_user_otp_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `law_firm_user_id` int unsigned NOT NULL,
  `code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` enum('email') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email',
  `purpose` enum('login','email_verify','invite') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'login',
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `max_attempts` tinyint unsigned NOT NULL DEFAULT '5',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lfu_otp_user` (`law_firm_user_id`),
  KEY `idx_lfu_otp_expires` (`expires_at`),
  KEY `idx_lfu_otp_lookup` (`law_firm_user_id`,`purpose`,`expires_at`),
  CONSTRAINT `fk_lfu_otp_user` FOREIGN KEY (`law_firm_user_id`) REFERENCES `law_firm_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `law_firm_user_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `law_firm_user_id` int unsigned NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lfu_sessions_token_hash` (`token_hash`),
  KEY `idx_lfu_sessions_user` (`law_firm_user_id`),
  KEY `idx_lfu_sessions_expires` (`expires_at`),
  KEY `idx_lfu_sessions_active` (`law_firm_user_id`,`is_active`),
  CONSTRAINT `fk_lfu_sessions_user` FOREIGN KEY (`law_firm_user_id`) REFERENCES `law_firm_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2) Copy data from legacy users
-- ---------------------------------------------------------------------------

INSERT INTO `staff_users` (
  `id`, `public_uuid`, `email`, `email_verified_at`, `first_name`, `last_name`, `phone`,
  `role`, `status`, `avatar_url`, `preferred_language`, `preferred_theme`, `timezone`,
  `last_login_at`, `created_at`, `updated_at`, `deleted_at`
)
SELECT
  `id`, `public_uuid`, `email`, `email_verified_at`, `first_name`, `last_name`, `phone`,
  `role`, `status`, `avatar_url`, `preferred_language`, `preferred_theme`, `timezone`,
  `last_login_at`, `created_at`, `updated_at`, `deleted_at`
FROM `users`
WHERE `role` <> 'law_firm_user'
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

INSERT INTO `law_firm_users` (
  `public_uuid`, `email`, `email_verified_at`, `first_name`, `last_name`, `phone`,
  `status`, `avatar_url`, `preferred_language`, `preferred_theme`, `timezone`,
  `last_login_at`, `created_at`, `updated_at`, `deleted_at`
)
SELECT
  `public_uuid`, `email`, `email_verified_at`, `first_name`, `last_name`, `phone`,
  `status`, `avatar_url`, `preferred_language`, `preferred_theme`, `timezone`,
  `last_login_at`, `created_at`, `updated_at`, `deleted_at`
FROM `users`
WHERE `role` = 'law_firm_user'
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- Map old user ids (law_firm) → new law_firm_users ids via email
-- Update law_firm_members: add new column, backfill, drop old FK

ALTER TABLE `law_firm_members`
  ADD COLUMN `law_firm_user_id` int unsigned NULL AFTER `law_firm_id`;

UPDATE `law_firm_members` m
JOIN `users` u ON u.id = m.user_id AND u.role = 'law_firm_user'
JOIN `law_firm_users` lfu ON lfu.email = u.email
SET m.law_firm_user_id = lfu.id;

-- Drop members that cannot be mapped (staff mistakenly linked)
DELETE FROM `law_firm_members` WHERE `law_firm_user_id` IS NULL;

ALTER TABLE `law_firm_members`
  DROP FOREIGN KEY `fk_law_firm_members_user`;

-- Keep law_firm_id indexed for firm FK before dropping composite unique
ALTER TABLE `law_firm_members`
  ADD KEY `idx_law_firm_members_firm` (`law_firm_id`);

ALTER TABLE `law_firm_members`
  DROP INDEX `uk_law_firm_members_firm_user`,
  DROP INDEX `idx_law_firm_members_user`,
  DROP COLUMN `user_id`;

ALTER TABLE `law_firm_members`
  MODIFY `law_firm_user_id` int unsigned NOT NULL,
  ADD UNIQUE KEY `uk_law_firm_members_firm_user` (`law_firm_id`,`law_firm_user_id`),
  ADD KEY `idx_law_firm_members_user` (`law_firm_user_id`),
  ADD CONSTRAINT `fk_law_firm_members_user`
    FOREIGN KEY (`law_firm_user_id`) REFERENCES `law_firm_users` (`id`) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 3) Remap operational FKs from users → staff_users
-- ---------------------------------------------------------------------------

ALTER TABLE `cases` DROP FOREIGN KEY `fk_cases_expert`;
ALTER TABLE `cases` DROP FOREIGN KEY `fk_cases_coordinator`;
ALTER TABLE `cases` DROP FOREIGN KEY `fk_cases_created_by`;
ALTER TABLE `cases`
  ADD CONSTRAINT `fk_cases_expert` FOREIGN KEY (`assigned_expert_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_cases_coordinator` FOREIGN KEY (`assigned_coordinator_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_cases_created_by` FOREIGN KEY (`created_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `case_assignments` DROP FOREIGN KEY `fk_case_assignments_user`;
ALTER TABLE `case_assignments` DROP FOREIGN KEY `fk_case_assignments_assigned_by`;
ALTER TABLE `case_assignments`
  ADD CONSTRAINT `fk_case_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `staff_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_case_assignments_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `case_status_history` DROP FOREIGN KEY `fk_case_status_history_user`;
ALTER TABLE `case_status_history`
  ADD CONSTRAINT `fk_case_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `case_deadlines` DROP FOREIGN KEY `fk_case_deadlines_created_by`;
ALTER TABLE `case_deadlines`
  ADD CONSTRAINT `fk_case_deadlines_created_by` FOREIGN KEY (`created_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `case_notes` DROP FOREIGN KEY `fk_case_notes_author`;
ALTER TABLE `case_notes`
  ADD CONSTRAINT `fk_case_notes_author` FOREIGN KEY (`author_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `documents` DROP FOREIGN KEY `fk_documents_uploaded_by`;
ALTER TABLE `documents` DROP FOREIGN KEY `fk_documents_approved_by`;
ALTER TABLE `documents`
  ADD COLUMN `uploaded_by_law_firm_user_id` int unsigned DEFAULT NULL AFTER `uploaded_by`,
  ADD CONSTRAINT `fk_documents_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_documents_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_documents_uploaded_by_lfu` FOREIGN KEY (`uploaded_by_law_firm_user_id`) REFERENCES `law_firm_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `document_versions` DROP FOREIGN KEY `fk_document_versions_uploaded_by`;
ALTER TABLE `document_versions`
  ADD CONSTRAINT `fk_document_versions_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `questionnaires` DROP FOREIGN KEY `fk_questionnaires_prepared_by`;
ALTER TABLE `questionnaires` DROP FOREIGN KEY `fk_questionnaires_reviewed_by`;
ALTER TABLE `questionnaires`
  ADD CONSTRAINT `fk_questionnaires_prepared_by` FOREIGN KEY (`prepared_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_questionnaires_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `review_requests` DROP FOREIGN KEY `fk_review_requests_requested_by`;
ALTER TABLE `review_requests` DROP FOREIGN KEY `fk_review_requests_assigned_to`;
ALTER TABLE `review_requests`
  ADD CONSTRAINT `fk_review_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_review_requests_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `inspections` DROP FOREIGN KEY `fk_inspections_expert`;
ALTER TABLE `inspections`
  ADD CONSTRAINT `fk_inspections_expert` FOREIGN KEY (`lead_expert_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `evidence_items` DROP FOREIGN KEY `fk_evidence_captured_by`;
ALTER TABLE `evidence_items`
  ADD CONSTRAINT `fk_evidence_captured_by` FOREIGN KEY (`captured_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `measurements` DROP FOREIGN KEY `fk_measurements_recorded_by`;
ALTER TABLE `measurements`
  ADD CONSTRAINT `fk_measurements_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `technical_reports` DROP FOREIGN KEY `fk_technical_reports_authored_by`;
ALTER TABLE `technical_reports`
  ADD CONSTRAINT `fk_technical_reports_authored_by` FOREIGN KEY (`authored_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `logistics_trips` DROP FOREIGN KEY `fk_logistics_trips_created_by`;
ALTER TABLE `logistics_trips`
  ADD CONSTRAINT `fk_logistics_trips_created_by` FOREIGN KEY (`created_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `logistics_expenses` DROP FOREIGN KEY `fk_logistics_expenses_created_by`;
ALTER TABLE `logistics_expenses`
  ADD CONSTRAINT `fk_logistics_expenses_created_by` FOREIGN KEY (`created_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `invoices` DROP FOREIGN KEY `fk_invoices_created_by`;
ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_invoices_created_by` FOREIGN KEY (`created_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `payments` DROP FOREIGN KEY `fk_payments_recorded_by`;
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `calendar_events` DROP FOREIGN KEY `fk_calendar_events_created_by`;
ALTER TABLE `calendar_events`
  ADD CONSTRAINT `fk_calendar_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

-- Notifications: polymorphic recipient (staff | law_firm)
ALTER TABLE `notifications` DROP FOREIGN KEY `fk_notifications_user`;
ALTER TABLE `notifications`
  ADD COLUMN `recipient_actor` enum('staff','law_firm') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'staff' AFTER `public_uuid`,
  CHANGE COLUMN `user_id` `recipient_id` int unsigned NOT NULL,
  DROP INDEX `idx_notifications_user_unread`,
  ADD KEY `idx_notifications_recipient_unread` (`recipient_actor`,`recipient_id`,`read_at`);

UPDATE `notifications` SET `recipient_actor` = 'staff';

ALTER TABLE `audit_logs` DROP FOREIGN KEY `fk_audit_logs_actor`;
ALTER TABLE `audit_logs`
  ADD COLUMN `actor_type` enum('staff','law_firm','system') COLLATE utf8mb4_unicode_ci DEFAULT 'staff' AFTER `public_uuid`,
  CHANGE COLUMN `actor_user_id` `actor_id` int unsigned DEFAULT NULL,
  DROP INDEX `idx_audit_logs_actor`,
  ADD KEY `idx_audit_logs_actor` (`actor_type`,`actor_id`);

-- ---------------------------------------------------------------------------
-- 4) Drop legacy unified auth tables
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS `user_otp_codes`;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `users`;

-- Staff login roles only (law firm uses separate portal/auth)
UPDATE `system_settings`
SET `setting_value` = 'admin,case_coordinator,expert,legal,logistics,accountant',
    `description` = 'Comma-separated staff roles allowed to request staff OTP login'
WHERE `setting_key` = 'login_allowed_roles';
