ALTER TABLE patients
  ADD COLUMN emergency_contact_name VARCHAR(100) NULL AFTER diabetes_type,
  ADD COLUMN emergency_contact_phone VARCHAR(40) NULL AFTER emergency_contact_name,
  ADD COLUMN emergency_service_phone VARCHAR(40) NULL AFTER emergency_contact_phone;

ALTER TABLE patient_members
  ADD COLUMN active_mascot VARCHAR(40) NOT NULL DEFAULT 'polar-bear' AFTER is_default;

ALTER TABLE care_plan_versions
  ADD COLUMN high_threshold SMALLINT UNSIGNED NOT NULL DEFAULT 250 AFTER low_threshold,
  ADD COLUMN auto_follow_up_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER high_threshold,
  ADD COLUMN standard_follow_up_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 120 AFTER auto_follow_up_enabled,
  ADD COLUMN low_follow_up_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 15 AFTER standard_follow_up_minutes,
  ADD COLUMN high_follow_up_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30 AFTER low_follow_up_minutes;

ALTER TABLE bolus_records
  ADD COLUMN client_id CHAR(36) NULL AFTER id,
  ADD UNIQUE KEY bolus_records_patient_client_unique (patient_id, client_id);

ALTER TABLE appointments
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER notes,
  ADD COLUMN reminder_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 1440 AFTER status,
  ADD COLUMN reminder_sent_at DATETIME(3) NULL AFTER reminder_minutes,
  ADD COLUMN updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) AFTER created_at,
  ADD KEY appointments_patient_status_time_idx (patient_id, status, scheduled_at);

ALTER TABLE timers
  ADD COLUMN kind VARCHAR(30) NOT NULL DEFAULT 'manual' AFTER label,
  ADD COLUMN source_record_id CHAR(36) NULL AFTER kind,
  ADD COLUMN remaining_seconds INT UNSIGNED NULL AFTER due_at,
  ADD COLUMN paused_at DATETIME(3) NULL AFTER remaining_seconds,
  ADD COLUMN notified_at DATETIME(3) NULL AFTER paused_at,
  ADD COLUMN updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) AFTER created_at,
  ADD KEY timers_source_record_idx (source_record_id),
  ADD CONSTRAINT timers_source_record_fk FOREIGN KEY (source_record_id) REFERENCES bolus_records(id) ON DELETE SET NULL;

CREATE TABLE user_preferences (
  user_id CHAR(36) PRIMARY KEY,
  theme VARCHAR(30) NOT NULL DEFAULT 'polar',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT user_preferences_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_preferences (
  user_id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  timers_enabled TINYINT(1) NOT NULL DEFAULT 1,
  appointments_enabled TINYINT(1) NOT NULL DEFAULT 1,
  glucose_alerts_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updates_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, patient_id),
  CONSTRAINT notification_preferences_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notification_preferences_patient_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE push_subscriptions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  device_name VARCHAR(160) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  UNIQUE KEY push_subscriptions_endpoint_hash_unique (endpoint_hash),
  KEY push_subscriptions_user_active_idx (user_id, revoked_at),
  CONSTRAINT push_subscriptions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(160) NOT NULL,
  body VARCHAR(500) NOT NULL,
  href VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_id CHAR(36) NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY notifications_recipient_source_unique (user_id, type, source_type, source_id),
  KEY notifications_user_patient_time_idx (user_id, patient_id, created_at),
  CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notifications_patient_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_deliveries (
  notification_id CHAR(36) NOT NULL,
  push_subscription_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_error VARCHAR(500) NULL,
  sent_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (notification_id, push_subscription_id),
  KEY notification_deliveries_status_idx (status, updated_at),
  CONSTRAINT notification_deliveries_notification_fk FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT notification_deliveries_subscription_fk FOREIGN KEY (push_subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
