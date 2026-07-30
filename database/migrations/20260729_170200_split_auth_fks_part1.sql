-- Remap remaining FKs + polymorphic notifications/audit + drop legacy users
SET NAMES utf8mb4;

ALTER TABLE `cases` DROP FOREIGN KEY `fk_cases_expert`;
ALTER TABLE `cases` DROP FOREIGN KEY `fk_cases_coordinator`;
ALTER TABLE `cases` DROP FOREIGN KEY `fk_cases_created_by`;
ALTER TABLE `cases`
  ADD CONSTRAINT `fk_cases_expert` FOREIGN KEY (`assigned_expert_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_cases_coordinator` FOREIGN KEY (`assigned_coordinator_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_cases_created_by` FOREIGN KEY (`created_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `case_assignments` DROP FOREIGN KEY `fk_case_assignments_user`;
ALTER TABLE `case_assignments` DROP FOREIGN KEY `fk_case_assignments_assigned_by`;
ALTER TABLE `case_assignments`
  ADD CONSTRAINT `fk_case_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `staff_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_case_assignments_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `case_status_history` DROP FOREIGN KEY `fk_case_status_history_user`;
ALTER TABLE `case_status_history`
  ADD CONSTRAINT `fk_case_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `case_deadlines` DROP FOREIGN KEY `fk_case_deadlines_created_by`;
ALTER TABLE `case_deadlines`
  ADD CONSTRAINT `fk_case_deadlines_created_by` FOREIGN KEY (`created_by`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;

ALTER TABLE `case_notes` DROP FOREIGN KEY `fk_case_notes_author`;
ALTER TABLE `case_notes`
  ADD CONSTRAINT `fk_case_notes_author` FOREIGN KEY (`author_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL;
