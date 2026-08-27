-- Link calendar deadline events to case_deadlines for reliable sync (expert delivery, etc.).
-- TiDB: apply column, index, and FK in separate ALTERs (combined ALTER can fail with 1072).
ALTER TABLE `calendar_events`
  ADD COLUMN `case_deadline_id` int unsigned DEFAULT NULL AFTER `case_id`;

ALTER TABLE `calendar_events`
  ADD KEY `idx_calendar_events_deadline` (`case_deadline_id`);

ALTER TABLE `calendar_events`
  ADD CONSTRAINT `fk_calendar_events_deadline`
    FOREIGN KEY (`case_deadline_id`) REFERENCES `case_deadlines` (`id`) ON DELETE SET NULL;
