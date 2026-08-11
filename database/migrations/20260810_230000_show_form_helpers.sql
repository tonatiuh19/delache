-- Per-user toggle: inline form field helpers (ON by default).
ALTER TABLE `staff_users`
  ADD COLUMN `show_form_helpers` tinyint(1) NOT NULL DEFAULT 1
    AFTER `preferred_theme`;

ALTER TABLE `law_firm_users`
  ADD COLUMN `show_form_helpers` tinyint(1) NOT NULL DEFAULT 1
    AFTER `preferred_theme`;
