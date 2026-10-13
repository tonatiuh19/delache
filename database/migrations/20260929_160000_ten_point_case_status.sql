-- Y rewrite: collapse 12-point case statuses → 10-point SoT.
-- logistics|inspection → field_ops
-- legal_validation|court_delivery → validation_delivery
-- Add protesta_modality (presencial|virtual)

-- 1) Widen enum with new values (keep old temporarily for UPDATE)
ALTER TABLE `cases`
  MODIFY COLUMN `status` enum(
    'intake',
    'assignment',
    'questionnaire',
    'legal_review_questionnaire',
    'additional_docs',
    'court_acceptance',
    'logistics',
    'inspection',
    'field_ops',
    'technical_report',
    'legal_validation',
    'court_delivery',
    'validation_delivery',
    'accounting',
    'completed',
    'on_hold',
    'cancelled'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'intake';

-- 2) Remap rows
UPDATE `cases` SET `status` = 'field_ops' WHERE `status` IN ('logistics', 'inspection');
UPDATE `cases` SET `status` = 'validation_delivery' WHERE `status` IN ('legal_validation', 'court_delivery');

-- 3) Remap status history (string columns — no enum)
UPDATE `case_status_history` SET `from_status` = 'field_ops'
  WHERE `from_status` IN ('logistics', 'inspection');
UPDATE `case_status_history` SET `to_status` = 'field_ops'
  WHERE `to_status` IN ('logistics', 'inspection');
UPDATE `case_status_history` SET `from_status` = 'validation_delivery'
  WHERE `from_status` IN ('legal_validation', 'court_delivery');
UPDATE `case_status_history` SET `to_status` = 'validation_delivery'
  WHERE `to_status` IN ('legal_validation', 'court_delivery');

-- 4) Drop legacy enum values
ALTER TABLE `cases`
  MODIFY COLUMN `status` enum(
    'intake',
    'assignment',
    'questionnaire',
    'legal_review_questionnaire',
    'additional_docs',
    'court_acceptance',
    'field_ops',
    'technical_report',
    'validation_delivery',
    'accounting',
    'completed',
    'on_hold',
    'cancelled'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'intake';

-- 5) Protesta modality (P6)
ALTER TABLE `cases`
  ADD COLUMN `protesta_modality` enum('presencial','virtual')
    COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'P6: presencial (print+scan) or virtual (signed upload)'
    AFTER `court_acceptance_at`;
