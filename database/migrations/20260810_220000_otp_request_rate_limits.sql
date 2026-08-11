-- Durable OTP request rate limits (email + IP buckets)
CREATE TABLE IF NOT EXISTS `otp_request_rate_limits` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `rate_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `window_started_at` datetime NOT NULL,
  `attempt_count` int unsigned NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_otp_request_rate_limits_key` (`rate_key`),
  KEY `idx_otp_request_rate_limits_window` (`window_started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
