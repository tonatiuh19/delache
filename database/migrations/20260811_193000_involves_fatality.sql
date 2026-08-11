-- Explicit fatality flag. Death-certificate gates must not infer from the
-- document itself (that made the requirement circular).
ALTER TABLE `cases`
  ADD COLUMN `involves_fatality` tinyint(1) NOT NULL DEFAULT 0
    AFTER `property_lng`;
