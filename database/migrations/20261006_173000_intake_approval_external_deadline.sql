-- CRM PDF decisions 4B+C, 6C, 7A, 10B:
-- - expediente approve stamp on cases
-- - optional external court deadline (null = no external clock)
-- - document rejection / correction request fields
-- - intake_correction typed deadline (3 business days)

ALTER TABLE `cases`
  ADD COLUMN `expediente_approved_at` datetime DEFAULT NULL
    COMMENT 'P1: admin approved intake package (Aprobar expediente)';

ALTER TABLE `cases`
  ADD COLUMN `expediente_approved_by` int unsigned DEFAULT NULL
    COMMENT 'Staff who approved the expediente';

ALTER TABLE `cases`
  ADD COLUMN `external_court_deadline_at` datetime DEFAULT NULL
    COMMENT 'Optional external court plazo; null = process SLAs only';

ALTER TABLE `cases`
  ADD CONSTRAINT `fk_cases_expediente_approved_by`
    FOREIGN KEY (`expediente_approved_by`) REFERENCES `staff_users` (`id`)
    ON DELETE SET NULL;

ALTER TABLE `documents`
  ADD COLUMN `rejection_reason` text COLLATE utf8mb4_unicode_ci DEFAULT NULL;

ALTER TABLE `documents`
  ADD COLUMN `correction_requested_at` datetime DEFAULT NULL
    COMMENT 'When admin requested despacho re-upload';

ALTER TABLE `documents`
  ADD COLUMN `correction_requested_by` int unsigned DEFAULT NULL;

ALTER TABLE `documents`
  ADD CONSTRAINT `fk_documents_correction_requested_by`
    FOREIGN KEY (`correction_requested_by`) REFERENCES `staff_users` (`id`)
    ON DELETE SET NULL;

ALTER TABLE `case_deadlines`
  MODIFY COLUMN `deadline_type` enum(
    'questionnaire',
    'legal_review',
    'court_acceptance_window',
    'inspection',
    'technical_report',
    'external_legal_validation',
    'court_delivery',
    'payment',
    'custom',
    'expert_delivery',
    'intake_correction'
  ) COLLATE utf8mb4_unicode_ci NOT NULL;
