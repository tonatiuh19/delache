-- Expert delivery deadline: coordinator-set date for primary perito + notifications.
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
    'expert_delivery'
  ) COLLATE utf8mb4_unicode_ci NOT NULL;
