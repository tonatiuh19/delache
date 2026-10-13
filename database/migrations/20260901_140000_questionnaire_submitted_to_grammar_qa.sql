-- Backfill legacy questionnaire status after P3 QA workflow change.

UPDATE `questionnaires`
SET `status` = 'grammar_qa'
WHERE `status` = 'submitted';
