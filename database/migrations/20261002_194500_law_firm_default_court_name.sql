-- Preferred juzgado name for a despacho — used to autofill cases.court_name
-- when create payload omits courtName (client portal / staff on-behalf).
ALTER TABLE `law_firms`
  ADD COLUMN `default_court_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
  AFTER `country`;
