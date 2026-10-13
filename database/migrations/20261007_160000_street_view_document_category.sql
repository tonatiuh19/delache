-- Paso 2 PDF: Street View / preexistencia as its own document category.
ALTER TABLE `documents`
  MODIFY COLUMN `category` enum(
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
    'street_view',
    'other'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other';
