-- DELACHE Database Schema
-- Source of truth — modify via database/migrations/
-- Compatible with: TiDB Cloud Serverless (MySQL 8.0)
-- Auth model: passwordless email OTP (no password columns)

SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';

-- ---------------------------------------------------------------------------
-- Identity & auth (passwordless OTP)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
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
    'accountant',
    'law_firm_user'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'expert',
  `status` enum('active','inactive','suspended','invited') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'invited',
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preferred_language` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'es',
  `preferred_theme` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system' COMMENT 'light | dark | system',
  `timezone` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'America/Mexico_City',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_public_uuid` (`public_uuid`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_otp_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
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
  KEY `idx_user_otp_user` (`user_id`),
  KEY `idx_user_otp_expires` (`expires_at`),
  KEY `idx_user_otp_lookup` (`user_id`,`purpose`,`expires_at`),
  CONSTRAINT `fk_user_otp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_sessions_token_hash` (`token_hash`),
  KEY `idx_user_sessions_user` (`user_id`),
  KEY `idx_user_sessions_expires` (`expires_at`),
  KEY `idx_user_sessions_active` (`user_id`,`is_active`),
  CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Organizations (external law firms / clients)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `law_firms` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` char(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MX',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_law_firms_public_uuid` (`public_uuid`),
  KEY `idx_law_firms_status` (`status`),
  KEY `idx_law_firms_name` (`name`),
  KEY `idx_law_firms_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `law_firm_members` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `law_firm_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `member_role` enum('owner','admin','member','viewer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `is_primary_contact` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_law_firm_members_firm_user` (`law_firm_id`,`user_id`),
  KEY `idx_law_firm_members_user` (`user_id`),
  CONSTRAINT `fk_law_firm_members_firm` FOREIGN KEY (`law_firm_id`) REFERENCES `law_firms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_law_firm_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Cases (core workflow — 12 phases)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `cases` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_number` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Human-readable Case ID',
  `external_reference` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Court / law-firm reference',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `law_firm_id` int unsigned DEFAULT NULL,
  `court_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `court_file_number` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plaintiff_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `defendant_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `status` enum(
    'intake',
    'assignment',
    'questionnaire',
    'legal_review_questionnaire',
    'additional_docs',
    'court_acceptance',
    'logistics',
    'inspection',
    'technical_report',
    'legal_validation',
    'court_delivery',
    'accounting',
    'completed',
    'on_hold',
    'cancelled'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'intake',
  `assigned_expert_id` int unsigned DEFAULT NULL,
  `assigned_coordinator_id` int unsigned DEFAULT NULL,
  `property_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_country` char(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MX',
  `property_lat` decimal(10,7) DEFAULT NULL,
  `property_lng` decimal(10,7) DEFAULT NULL,
  `gps_validated_at` datetime DEFAULT NULL,
  `street_view_validated_at` datetime DEFAULT NULL,
  `power_line_verified_at` datetime DEFAULT NULL,
  `intake_received_at` datetime DEFAULT NULL,
  `court_acceptance_at` datetime DEFAULT NULL,
  `inspection_deadline_at` datetime DEFAULT NULL COMMENT '10 business-day countdown after court acceptance',
  `completed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancel_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cases_public_uuid` (`public_uuid`),
  UNIQUE KEY `uk_cases_case_number` (`case_number`),
  KEY `idx_cases_status` (`status`),
  KEY `idx_cases_priority` (`priority`),
  KEY `idx_cases_law_firm` (`law_firm_id`),
  KEY `idx_cases_expert` (`assigned_expert_id`),
  KEY `idx_cases_coordinator` (`assigned_coordinator_id`),
  KEY `idx_cases_city` (`property_city`),
  KEY `idx_cases_deadline` (`inspection_deadline_at`),
  KEY `idx_cases_deleted` (`deleted_at`),
  CONSTRAINT `fk_cases_law_firm` FOREIGN KEY (`law_firm_id`) REFERENCES `law_firms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cases_expert` FOREIGN KEY (`assigned_expert_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cases_coordinator` FOREIGN KEY (`assigned_coordinator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cases_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `case_assignments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `case_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `assignment_role` enum(
    'expert',
    'coordinator',
    'legal_reviewer',
    'logistics',
    'accountant',
    'qa',
    'technical_director',
    'observer'
  ) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `assigned_by` int unsigned DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unassigned_at` datetime DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_case_assignments_active` (`case_id`,`user_id`,`assignment_role`),
  KEY `idx_case_assignments_user` (`user_id`),
  CONSTRAINT `fk_case_assignments_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_case_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_case_assignments_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `case_status_history` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `case_id` int unsigned NOT NULL,
  `from_status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_status` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` int unsigned DEFAULT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_case_status_history_case` (`case_id`,`created_at`),
  CONSTRAINT `fk_case_status_history_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_case_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `case_deadlines` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `case_id` int unsigned NOT NULL,
  `deadline_type` enum(
    'questionnaire',
    'legal_review',
    'court_acceptance_window',
    'inspection',
    'technical_report',
    'external_legal_validation',
    'court_delivery',
    'payment',
    'custom'
  ) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `due_at` datetime NOT NULL,
  `business_days` smallint unsigned DEFAULT NULL,
  `severity_level` enum('safe','warning','critical','overdue') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'safe',
  `completed_at` datetime DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_case_deadlines_case` (`case_id`),
  KEY `idx_case_deadlines_due` (`due_at`,`severity_level`),
  CONSTRAINT `fk_case_deadlines_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_case_deadlines_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `case_notes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `case_id` int unsigned NOT NULL,
  `author_id` int unsigned DEFAULT NULL,
  `visibility` enum('internal','law_firm','all') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'internal',
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_case_notes_case` (`case_id`,`created_at`),
  CONSTRAINT `fk_case_notes_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_case_notes_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Documents (versioned)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `documents` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_id` int unsigned NOT NULL,
  `category` enum(
    'lawsuit',
    'medical_record',
    'cfe_report',
    'preliminary_photo',
    'defendant_response',
    'death_certificate',
    'sketch',
    'plaintiff_questionnaire',
    'questionnaire',
    'technical_report',
    'court_filing',
    'protesta',
    'ratification',
    'invoice',
    'receipt',
    'logistics',
    'other'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `current_version` int unsigned NOT NULL DEFAULT '1',
  `status` enum('draft','uploaded','under_review','approved','rejected','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'uploaded',
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_by` int unsigned DEFAULT NULL,
  `approved_by` int unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_documents_public_uuid` (`public_uuid`),
  KEY `idx_documents_case` (`case_id`),
  KEY `idx_documents_category` (`case_id`,`category`),
  KEY `idx_documents_status` (`status`),
  CONSTRAINT `fk_documents_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_documents_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_documents_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `document_versions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `document_id` int unsigned NOT NULL,
  `version_number` int unsigned NOT NULL,
  `storage_key` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Object storage key / path',
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size_bytes` bigint unsigned NOT NULL DEFAULT '0',
  `checksum_sha256` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` int unsigned DEFAULT NULL,
  `change_summary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_document_versions` (`document_id`,`version_number`),
  KEY `idx_document_versions_doc` (`document_id`),
  CONSTRAINT `fk_document_versions_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_document_versions_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Questionnaires & reviews
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `questionnaires` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_id` int unsigned NOT NULL,
  `status` enum(
    'draft',
    'submitted',
    'legal_review',
    'changes_requested',
    'approved',
    'rejected'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `content_json` json DEFAULT NULL,
  `chronology_json` json DEFAULT NULL,
  `technical_observations` text COLLATE utf8mb4_unicode_ci,
  `prepared_by` int unsigned DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `reviewed_by` int unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_questionnaires_public_uuid` (`public_uuid`),
  KEY `idx_questionnaires_case` (`case_id`),
  KEY `idx_questionnaires_status` (`status`),
  CONSTRAINT `fk_questionnaires_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_questionnaires_prepared_by` FOREIGN KEY (`prepared_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_questionnaires_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `review_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `case_id` int unsigned NOT NULL,
  `entity_type` enum('questionnaire','technical_report','document','inspection') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int unsigned NOT NULL,
  `review_stage` enum(
    'grammar_qa',
    'technical_director',
    'internal_legal',
    'external_law_firm'
  ) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','changes_requested','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `requested_by` int unsigned DEFAULT NULL,
  `assigned_to` int unsigned DEFAULT NULL,
  `due_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_review_requests_case` (`case_id`),
  KEY `idx_review_requests_entity` (`entity_type`,`entity_id`),
  KEY `idx_review_requests_status` (`status`,`due_at`),
  CONSTRAINT `fk_review_requests_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_review_requests_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Inspections, evidence, measurements
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `inspections` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_id` int unsigned NOT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  `lead_expert_id` int unsigned DEFAULT NULL,
  `location_lat` decimal(10,7) DEFAULT NULL,
  `location_lng` decimal(10,7) DEFAULT NULL,
  `location_accuracy_m` decimal(8,2) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `offline_synced_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inspections_public_uuid` (`public_uuid`),
  KEY `idx_inspections_case` (`case_id`),
  KEY `idx_inspections_status` (`status`),
  KEY `idx_inspections_scheduled` (`scheduled_at`),
  CONSTRAINT `fk_inspections_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inspections_expert` FOREIGN KEY (`lead_expert_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evidence_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_id` int unsigned NOT NULL,
  `inspection_id` int unsigned DEFAULT NULL,
  `evidence_type` enum(
    'photo',
    'video',
    'voice_note',
    'measurement',
    'signature',
    'gps_point',
    'observation',
    'court_filing',
    'other'
  ) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum(
    'horizontal_distance',
    'vertical_distance',
    'pole_distance',
    'pole_id',
    'electrical_structure',
    'conductor',
    'facade',
    'sidewalk',
    'construction',
    'property_invasion',
    'oversized_construction',
    'safety',
    'general'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `caption` text COLLATE utf8mb4_unicode_ci,
  `storage_key` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size_bytes` bigint unsigned DEFAULT NULL,
  `captured_at` datetime DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `captured_by` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_evidence_public_uuid` (`public_uuid`),
  KEY `idx_evidence_case` (`case_id`),
  KEY `idx_evidence_inspection` (`inspection_id`),
  KEY `idx_evidence_type` (`evidence_type`,`category`),
  CONSTRAINT `fk_evidence_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evidence_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_evidence_captured_by` FOREIGN KEY (`captured_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `measurements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `case_id` int unsigned NOT NULL,
  `inspection_id` int unsigned DEFAULT NULL,
  `evidence_item_id` int unsigned DEFAULT NULL,
  `measurement_type` enum(
    'horizontal_distance',
    'vertical_distance',
    'pole_distance',
    'other'
  ) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value_numeric` decimal(12,4) NOT NULL,
  `unit` enum('m','cm','ft','in') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'm',
  `pole_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `recorded_by` int unsigned DEFAULT NULL,
  `recorded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_measurements_case` (`case_id`),
  KEY `idx_measurements_inspection` (`inspection_id`),
  CONSTRAINT `fk_measurements_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_measurements_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_measurements_evidence` FOREIGN KEY (`evidence_item_id`) REFERENCES `evidence_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_measurements_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `technical_reports` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_id` int unsigned NOT NULL,
  `status` enum(
    'draft',
    'grammar_qa',
    'technical_director',
    'approved_internal',
    'external_review',
    'changes_requested',
    'approved',
    'rejected',
    'delivered'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `version_number` int unsigned NOT NULL DEFAULT '1',
  `investigation_summary` mediumtext COLLATE utf8mb4_unicode_ci,
  `conclusions` mediumtext COLLATE utf8mb4_unicode_ci,
  `photo_catalog_json` json DEFAULT NULL,
  `document_id` int unsigned DEFAULT NULL,
  `authored_by` int unsigned DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_technical_reports_public_uuid` (`public_uuid`),
  KEY `idx_technical_reports_case` (`case_id`),
  KEY `idx_technical_reports_status` (`status`),
  CONSTRAINT `fk_technical_reports_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_technical_reports_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_technical_reports_authored_by` FOREIGN KEY (`authored_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Logistics
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `logistics_trips` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_id` int unsigned NOT NULL,
  `inspection_id` int unsigned DEFAULT NULL,
  `status` enum('planned','booked','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'planned',
  `departure_at` datetime DEFAULT NULL,
  `return_at` datetime DEFAULT NULL,
  `origin_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destination_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `itinerary_json` json DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_logistics_trips_public_uuid` (`public_uuid`),
  KEY `idx_logistics_trips_case` (`case_id`),
  KEY `idx_logistics_trips_status` (`status`),
  CONSTRAINT `fk_logistics_trips_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_logistics_trips_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_logistics_trips_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `logistics_expenses` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `trip_id` int unsigned NOT NULL,
  `case_id` int unsigned NOT NULL,
  `expense_type` enum('flight','hotel','rental_car','fuel','meals','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `vendor_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `expense_date` date DEFAULT NULL,
  `receipt_document_id` int unsigned DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_logistics_expenses_trip` (`trip_id`),
  KEY `idx_logistics_expenses_case` (`case_id`),
  CONSTRAINT `fk_logistics_expenses_trip` FOREIGN KEY (`trip_id`) REFERENCES `logistics_trips` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_logistics_expenses_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_logistics_expenses_receipt` FOREIGN KEY (`receipt_document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_logistics_expenses_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Accounting
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_id` int unsigned NOT NULL,
  `law_firm_id` int unsigned DEFAULT NULL,
  `invoice_number` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_type` enum('advance','final','expense','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','issued','partially_paid','paid','void','overdue') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `issued_at` datetime DEFAULT NULL,
  `due_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `document_id` int unsigned DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invoices_public_uuid` (`public_uuid`),
  UNIQUE KEY `uk_invoices_number` (`invoice_number`),
  KEY `idx_invoices_case` (`case_id`),
  KEY `idx_invoices_status` (`status`),
  KEY `idx_invoices_type` (`invoice_type`),
  CONSTRAINT `fk_invoices_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invoices_law_firm` FOREIGN KEY (`law_firm_id`) REFERENCES `law_firms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_id` int unsigned NOT NULL,
  `case_id` int unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `method` enum('transfer','check','cash','card','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'transfer',
  `status` enum('pending','completed','failed','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `reference` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_document_id` int unsigned DEFAULT NULL,
  `recorded_by` int unsigned DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_public_uuid` (`public_uuid`),
  KEY `idx_payments_invoice` (`invoice_id`),
  KEY `idx_payments_case` (`case_id`),
  KEY `idx_payments_status` (`status`),
  CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_receipt` FOREIGN KEY (`receipt_document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Calendar, notifications, audit, settings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_id` int unsigned DEFAULT NULL,
  `event_type` enum(
    'court_date',
    'inspection',
    'travel',
    'deadline',
    'meeting',
    'ratification',
    'other'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `all_day` tinyint(1) NOT NULL DEFAULT '0',
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_calendar_events_public_uuid` (`public_uuid`),
  KEY `idx_calendar_events_case` (`case_id`),
  KEY `idx_calendar_events_starts` (`starts_at`),
  KEY `idx_calendar_events_type` (`event_type`),
  CONSTRAINT `fk_calendar_events_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_calendar_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int unsigned NOT NULL,
  `case_id` int unsigned DEFAULT NULL,
  `channel` enum('in_app','email') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_app',
  `notification_type` enum(
    'new_assignment',
    'missing_documents',
    'deadline_approaching',
    'inspection_scheduled',
    'travel_confirmed',
    'qa_requested',
    'report_approved',
    'court_filing',
    'payment_received',
    'invoice_pending',
    'otp_login',
    'general'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_json` json DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `email_sent_at` datetime DEFAULT NULL,
  `email_provider_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Resend message id',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_notifications_public_uuid` (`public_uuid`),
  KEY `idx_notifications_user_unread` (`user_id`,`read_at`),
  KEY `idx_notifications_case` (`case_id`),
  KEY `idx_notifications_type` (`notification_type`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_user_id` int unsigned DEFAULT NULL,
  `case_id` int unsigned DEFAULT NULL,
  `entity_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `previous_value_json` json DEFAULT NULL,
  `new_value_json` json DEFAULT NULL,
  `comment` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `geo_lat` decimal(10,7) DEFAULT NULL,
  `geo_lng` decimal(10,7) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_audit_logs_public_uuid` (`public_uuid`),
  KEY `idx_audit_logs_actor` (`actor_user_id`),
  KEY `idx_audit_logs_case` (`case_id`,`created_at`),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_logs_created` (`created_at`),
  CONSTRAINT `fk_audit_logs_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_audit_logs_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` mediumtext COLLATE utf8mb4_unicode_ci,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_system_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed defaults
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`)
VALUES
  ('app_version', '0.1.0', 'Current deployed application version'),
  ('otp_ttl_minutes', '10', 'OTP code lifetime in minutes'),
  ('otp_max_attempts', '5', 'Max verification attempts per OTP'),
  ('session_ttl_days', '14', 'Session token lifetime in days'),
  ('default_locale', 'es', 'Default UI locale')
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`);
