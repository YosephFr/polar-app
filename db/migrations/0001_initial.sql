CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(190) NULL,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY users_username_unique (username),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY sessions_token_hash_unique (token_hash),
  KEY sessions_user_id_idx (user_id),
  KEY sessions_expires_at_idx (expires_at),
  CONSTRAINT sessions_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patients (
  id CHAR(36) PRIMARY KEY,
  created_by CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  birth_date DATE NULL,
  sex VARCHAR(40) NULL,
  diabetes_type VARCHAR(30) NOT NULL DEFAULT 'type1',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY patients_created_by_idx (created_by),
  CONSTRAINT patients_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patient_members (
  patient_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'caregiver',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (patient_id, user_id),
  KEY patient_members_user_idx (user_id, is_default),
  CONSTRAINT patient_members_patient_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT patient_members_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS care_plan_versions (
  id CHAR(36) PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  version INT UNSIGNED NOT NULL,
  basal_insulin_name VARCHAR(100) NULL,
  basal_dose DECIMAL(7,2) NULL,
  rapid_insulin_name VARCHAR(100) NULL,
  correction_factor DECIMAL(8,2) NOT NULL,
  premeal_target SMALLINT UNSIGNED NOT NULL,
  correction_target SMALLINT UNSIGNED NOT NULL,
  low_threshold SMALLINT UNSIGNED NOT NULL DEFAULT 70,
  rounding_increment DECIMAL(4,2) NOT NULL DEFAULT 1,
  max_bolus DECIMAL(7,2) NULL,
  ratio_breakfast DECIMAL(8,2) NOT NULL,
  ratio_morning_snack DECIMAL(8,2) NOT NULL,
  ratio_lunch DECIMAL(8,2) NOT NULL,
  ratio_afternoon_snack DECIMAL(8,2) NOT NULL,
  ratio_dinner DECIMAL(8,2) NOT NULL,
  hypo_treatment_note TEXT NULL,
  created_by CHAR(36) NOT NULL,
  effective_from DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY care_plan_patient_version_unique (patient_id, version),
  KEY care_plan_patient_effective_idx (patient_id, effective_from),
  CONSTRAINT care_plan_patient_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT care_plan_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bolus_records (
  id CHAR(36) PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  care_plan_version INT UNSIGNED NOT NULL,
  meal_type VARCHAR(40) NOT NULL,
  glucose SMALLINT UNSIGNED NOT NULL,
  carbs DECIMAL(8,2) NOT NULL DEFAULT 0,
  target SMALLINT UNSIGNED NOT NULL,
  ratio_value DECIMAL(8,2) NOT NULL DEFAULT 0,
  correction_factor DECIMAL(8,2) NOT NULL,
  active_insulin DECIMAL(7,2) NOT NULL DEFAULT 0,
  activity_adjustment_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  meal_dose DECIMAL(7,2) NOT NULL DEFAULT 0,
  correction_dose DECIMAL(7,2) NOT NULL DEFAULT 0,
  recommended_dose DECIMAL(7,2) NULL,
  administered_dose DECIMAL(7,2) NULL,
  status VARCHAR(30) NOT NULL,
  notes VARCHAR(500) NULL,
  occurred_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY bolus_records_patient_time_idx (patient_id, occurred_at),
  KEY bolus_records_user_idx (user_id),
  CONSTRAINT bolus_records_patient_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT bolus_records_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id CHAR(36) PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  title VARCHAR(160) NOT NULL,
  scheduled_at DATETIME(3) NOT NULL,
  notes VARCHAR(500) NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY appointments_patient_time_idx (patient_id, scheduled_at),
  CONSTRAINT appointments_patient_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT appointments_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timers (
  id CHAR(36) PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  label VARCHAR(120) NOT NULL,
  due_at DATETIME(3) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY timers_patient_due_idx (patient_id, status, due_at),
  CONSTRAINT timers_patient_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT timers_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY,
  patient_id CHAR(36) NULL,
  user_id CHAR(36) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id CHAR(36) NULL,
  details_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY audit_logs_patient_time_idx (patient_id, created_at),
  KEY audit_logs_user_time_idx (user_id, created_at),
  CONSTRAINT audit_logs_patient_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  CONSTRAINT audit_logs_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

