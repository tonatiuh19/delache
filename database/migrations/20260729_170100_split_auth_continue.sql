-- Continue split auth migration after partial apply
SET NAMES utf8mb4;

-- Finish law_firm_members remap
ALTER TABLE `law_firm_members`
  DROP INDEX `uk_law_firm_members_firm_user`,
  DROP INDEX `idx_law_firm_members_user`;

ALTER TABLE `law_firm_members`
  DROP COLUMN `user_id`;

DELETE FROM `law_firm_members` WHERE `law_firm_user_id` IS NULL;

ALTER TABLE `law_firm_members`
  MODIFY `law_firm_user_id` int unsigned NOT NULL,
  ADD UNIQUE KEY `uk_law_firm_members_firm_user` (`law_firm_id`,`law_firm_user_id`),
  ADD KEY `idx_law_firm_members_user` (`law_firm_user_id`),
  ADD CONSTRAINT `fk_law_firm_members_user`
    FOREIGN KEY (`law_firm_user_id`) REFERENCES `law_firm_users` (`id`) ON DELETE CASCADE;

-- Remap operational FKs users → staff_users
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

-- Add column only if missing (safe re-run)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'documents'
    AND COLUMN_NAME = 'uploaded_by_law_firm_user_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `documents` ADD COLUMN `uploaded_by_law_firm_user_id` int unsigned DEFAULT NULL AFTER `uploaded_by`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE `documents`
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

-- Notifications polymorphic
ALTER TABLE `notifications` DROP FOREIGN KEY `fk_notifications_user`;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications'
    AND COLUMN_NAME = 'recipient_actor'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `notifications` ADD COLUMN `recipient_actor` enum(''staff'',''law_firm'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''staff'' AFTER `public_uuid`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications'
    AND COLUMN_NAME = 'recipient_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `notifications` CHANGE COLUMN `user_id` `recipient_id` int unsigned NOT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop old unread index if present
SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_notifications_user_unread'
);
SET @sql := IF(@idx > 0, 'ALTER TABLE `notifications` DROP INDEX `idx_notifications_user_unread`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_notifications_recipient_unread'
);
SET @sql := IF(@idx = 0,
  'ALTER TABLE `notifications` ADD KEY `idx_notifications_recipient_unread` (`recipient_actor`,`recipient_id`,`read_at`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `notifications` SET `recipient_actor` = 'staff' WHERE `recipient_actor` IS NULL OR `recipient_actor` = 'staff';

-- Audit logs polymorphic
ALTER TABLE `audit_logs` DROP FOREIGN KEY `fk_audit_logs_actor`;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'actor_type'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `audit_logs` ADD COLUMN `actor_type` enum(''staff'',''law_firm'',''system'') COLLATE utf8mb4_unicode_ci DEFAULT ''staff'' AFTER `public_uuid`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'actor_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `audit_logs` CHANGE COLUMN `actor_user_id` `actor_id` int unsigned DEFAULT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_logs_actor'
);
SET @sql := IF(@idx > 0, 'ALTER TABLE `audit_logs` DROP INDEX `idx_audit_logs_actor`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE `audit_logs`
  ADD KEY `idx_audit_logs_actor` (`actor_type`,`actor_id`);

DROP TABLE IF EXISTS `user_otp_codes`;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `users`;

UPDATE `system_settings`
SET `setting_value` = 'admin,case_coordinator,expert,legal,logistics,accountant',
    `description` = 'Comma-separated staff roles allowed to request staff OTP login'
WHERE `setting_key` = 'login_allowed_roles';
