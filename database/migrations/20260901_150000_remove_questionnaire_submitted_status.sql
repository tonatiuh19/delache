-- Remove legacy questionnaire status `submitted` (replaced by grammar_qa).

UPDATE `questionnaires`
SET `status` = 'grammar_qa'
WHERE `status` = 'submitted';

ALTER TABLE `questionnaires`
  MODIFY COLUMN `status` enum(
    'draft',
    'grammar_qa',
    'legal_review',
    'changes_requested',
    'approved',
    'rejected'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft';
