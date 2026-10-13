-- Process audit gaps: P3 QA status, P2 handoff, P11 ratification scheduled, P9 report chapters

ALTER TABLE `questionnaires`
  MODIFY COLUMN `status` enum(
    'draft',
    'submitted',
    'grammar_qa',
    'legal_review',
    'changes_requested',
    'approved',
    'rejected'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft';

ALTER TABLE `cases`
  ADD COLUMN `documents_handoff_confirmed_at` datetime DEFAULT NULL
    COMMENT 'P2: coordinator confirmed intake package reached primary expert',
  ADD COLUMN `documents_handoff_confirmed_by` int unsigned DEFAULT NULL
    COMMENT 'Staff who confirmed P2 handoff',
  ADD COLUMN `ratification_scheduled_at` datetime DEFAULT NULL
    COMMENT 'P11: judicial ratification hearing scheduled (before evidence upload)';

ALTER TABLE `cases`
  ADD CONSTRAINT `fk_cases_handoff_confirmed_by`
    FOREIGN KEY (`documents_handoff_confirmed_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `technical_reports`
  ADD COLUMN `defendant_questionnaire_summary` mediumtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN `plaintiff_questionnaire_summary` mediumtext COLLATE utf8mb4_unicode_ci DEFAULT NULL;
