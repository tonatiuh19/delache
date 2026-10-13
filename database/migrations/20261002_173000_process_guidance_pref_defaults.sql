-- Process guidance opt-in (default OFF). Form helpers default OFF for cleaner UX.
-- Existing users: force both prefs OFF so roles are not overwhelmed by tip copy.

ALTER TABLE `staff_users`
  ADD COLUMN `show_process_guidance` tinyint(1) NOT NULL DEFAULT 0
    AFTER `show_form_helpers`;

ALTER TABLE `law_firm_users`
  ADD COLUMN `show_process_guidance` tinyint(1) NOT NULL DEFAULT 0
    AFTER `show_form_helpers`;

ALTER TABLE `staff_users`
  MODIFY COLUMN `show_form_helpers` tinyint(1) NOT NULL DEFAULT 0;

ALTER TABLE `law_firm_users`
  MODIFY COLUMN `show_form_helpers` tinyint(1) NOT NULL DEFAULT 0;

UPDATE `staff_users`
SET `show_form_helpers` = 0,
    `show_process_guidance` = 0
WHERE `deleted_at` IS NULL;

UPDATE `law_firm_users`
SET `show_form_helpers` = 0,
    `show_process_guidance` = 0
WHERE `deleted_at` IS NULL;
