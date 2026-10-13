-- Field ops: calendar date by which the dictamen must be finished.
-- Required before the case can leave field_ops.

ALTER TABLE `cases`
  ADD COLUMN `dictamen_due_at` datetime DEFAULT NULL
    COMMENT 'Field ops: date the dictamen must be finished before leaving the step'
    AFTER `external_court_deadline_at`;
