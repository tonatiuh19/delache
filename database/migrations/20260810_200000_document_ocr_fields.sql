-- Document OCR fields for DMS (Product.md document management)
-- TiDB: add columns one-at-a-time without AFTER refs to columns added in the same statement.

ALTER TABLE `document_versions`
  ADD COLUMN `ocr_text` mediumtext COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE `document_versions`
  ADD COLUMN `ocr_status` enum(
    'pending',
    'processing',
    'completed',
    'failed',
    'skipped'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending';

ALTER TABLE `document_versions`
  ADD COLUMN `ocr_processed_at` datetime DEFAULT NULL;

ALTER TABLE `document_versions`
  ADD KEY `idx_document_versions_ocr_status` (`ocr_status`);
