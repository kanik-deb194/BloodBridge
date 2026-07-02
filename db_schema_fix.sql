-- BloodBridge Database Schema Fix Script
-- Run this in phpMyAdmin or MySQL CLI to create ALL missing tables
-- Uses CREATE TABLE IF NOT EXISTS so it won't break existing tables

CREATE TABLE IF NOT EXISTS emergency_request (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_user_id INT NOT NULL,
    voice_transcript TEXT,
    extracted_name VARCHAR(255),
    extracted_blood_group VARCHAR(10),
    extracted_location VARCHAR(255),
    requester_phone VARCHAR(50),
    required_units INT DEFAULT 1,
    blood_bank_id INT,
    assigned_to_user_id INT,
    status ENUM('pending','assigned','processed','dismissed') DEFAULT 'pending',
    processed_by_ai TINYINT(1) DEFAULT 1,
    matched_donor_count INT DEFAULT 0,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_requester (requester_user_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS drone (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blood_bank_id INT NOT NULL,
    drone_code VARCHAR(50) UNIQUE,
    status ENUM('idle','in_flight','en_route','charging','maintenance','delivering') DEFAULT 'idle',
    battery_level DECIMAL(5,2),
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    max_weight_kg DECIMAL(5,2),
    INDEX idx_blood_bank (blood_bank_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS drone_dispatch (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drone_id INT NOT NULL,
    blood_request_id INT NOT NULL,
    source_bank_id INT NOT NULL,
    destination_lat DECIMAL(10,8),
    destination_lng DECIMAL(11,8),
    status ENUM('scheduled','dispatched','en_route','in_transit','awaiting_handoff','delivered') DEFAULT 'scheduled',
    estimated_arrival DATETIME,
    actual_arrival DATETIME,
    battery_at_dispatch DECIMAL(5,2),
    speed_kmh DECIMAL(5,2),
    current_lat DECIMAL(10,8),
    current_lng DECIMAL(11,8),
    tracking_data JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_drone (drone_id),
    INDEX idx_request (blood_request_id),
    INDEX idx_source (source_bank_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS patient_registry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    national_id VARCHAR(100) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    blood_group VARCHAR(10),
    phone VARCHAR(50),
    address TEXT,
    date_of_birth DATE,
    last_blood_request DATETIME,
    INDEX idx_phone (phone),
    INDEX idx_blood_group (blood_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS donor_health_record (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_user_id INT NOT NULL,
    haemoglobin DECIMAL(5,2),
    blood_pressure_sys INT,
    blood_pressure_dia INT,
    pulse INT,
    weight_kg DECIMAL(5,2),
    temperature DECIMAL(4,1),
    notes TEXT,
    recorded_at DATETIME,
    INDEX idx_donor (donor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bank_review (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blood_bank_id INT NOT NULL,
    reviewer_user_id INT NOT NULL,
    rating TINYINT(1),
    review_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    UNIQUE KEY uk_review (blood_bank_id, reviewer_user_id),
    INDEX idx_blood_bank (blood_bank_id),
    INDEX idx_reviewer (reviewer_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS family_legacy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    family_name VARCHAR(255),
    blood_bank_id INT,
    total_donations INT DEFAULT 0,
    INDEX idx_blood_bank (blood_bank_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS address (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('user') DEFAULT 'user',
    entity_id INT NOT NULL,
    address_line VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Bangladesh',
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS storage_unit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blood_bank_id INT,
    sensor_id VARCHAR(100),
    min_temp DECIMAL(4,1) DEFAULT 2.0,
    max_temp DECIMAL(4,1) DEFAULT 6.0,
    INDEX idx_blood_bank (blood_bank_id),
    INDEX idx_sensor (sensor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transfusion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_user_id INT,
    request_id INT,
    blood_bag_id INT,
    hospital_id INT,
    issued_at DATETIME,
    crossmatch_result VARCHAR(50),
    reaction_notes TEXT,
    INDEX idx_recipient (recipient_user_id),
    INDEX idx_request (request_id),
    INDEX idx_blood_bag (blood_bag_id),
    INDEX idx_hospital (hospital_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add blood_bag_id column to existing transfusion table if missing
SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transfusion' AND COLUMN_NAME = 'blood_bag_id') = 0,
    'ALTER TABLE transfusion ADD COLUMN blood_bag_id INT AFTER request_id',
    'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS chat_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_id VARCHAR(255),
    message TEXT,
    sender ENUM('user','bot','assistant') DEFAULT 'user',
    intent_detected VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS blood_culture_test (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_user_id INT,
    request_id INT,
    blood_bag_id INT,
    result VARCHAR(50),
    pathogen_detected VARCHAR(255),
    comments TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    donor_price DECIMAL(10,2),
    lab_technician_id INT,
    test_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_donor (donor_user_id),
    INDEX idx_request (request_id),
    INDEX idx_blood_bag (blood_bag_id),
    INDEX idx_lab_tech (lab_technician_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS approval_step (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_id INT NOT NULL,
    entity_type VARCHAR(50) DEFAULT 'blood_request',
    approver_user_id INT,
    step_order TINYINT DEFAULT 1,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    comments TEXT,
    price_per_unit DECIMAL(10,2),
    total_units INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_id, entity_type),
    INDEX idx_approver (approver_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_warning (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    target_type ENUM('blood_bank','user') NOT NULL,
    target_id INT NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'sent',
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    response VARCHAR(50),
    responded_at DATETIME,
    is_dismissed TINYINT(1) DEFAULT 0,
    action_taken VARCHAR(100),
    improvement_plan TEXT,
    appeal_reason TEXT,
    admin_improvement_plan TEXT,
    INDEX idx_target (target_type, target_id),
    INDEX idx_admin (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS temperature_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blood_bank_id INT,
    sensor_id VARCHAR(100),
    temperature_celsius DECIMAL(4,1),
    recorded_at DATETIME,
    is_alert TINYINT(1) DEFAULT 0,
    resolved_at DATETIME,
    INDEX idx_blood_bank (blood_bank_id),
    INDEX idx_sensor (sensor_id),
    INDEX idx_alert (is_alert)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS donation_promise (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_user_id INT NOT NULL,
    blood_bank_id INT NOT NULL,
    promise_time DATETIME,
    confirmation_code VARCHAR(12) UNIQUE,
    status ENUM('pending','fulfilled','broken','cancelled') DEFAULT 'pending',
    fulfilled_at DATETIME,
    broken_at DATETIME,
    INDEX idx_donor (donor_user_id),
    INDEX idx_bank (blood_bank_id),
    INDEX idx_code (confirmation_code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS partner_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id_1 INT NOT NULL,
    user_id_2 INT NOT NULL,
    status ENUM('pending','active','rejected') DEFAULT 'pending',
    action_user INT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user1 (user_id_1),
    INDEX idx_user2 (user_id_2),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS thalassemia_carrier (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    is_carrier TINYINT(1) DEFAULT 0,
    confirmed_by INT,
    confirmed_at DATETIME,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS thalassemia_couple_alert (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id_1 INT NOT NULL,
    user_id_2 INT NOT NULL,
    risk_percentage TINYINT DEFAULT 25,
    advice TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_couple (user_id_1, user_id_2),
    INDEX idx_user1 (user_id_1),
    INDEX idx_user2 (user_id_2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS request_timeline (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    status VARCHAR(50),
    changed_by_user_id INT,
    remarks TEXT,
    previous_hash VARCHAR(64),
    current_hash VARCHAR(64),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_request (request_id),
    INDEX idx_changed_by (changed_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS donation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_user_id INT NOT NULL,
    blood_bank_id INT NOT NULL,
    donation_promise_id INT,
    donation_date DATETIME,
    status ENUM('completed') DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_donor (donor_user_id),
    INDEX idx_bank (blood_bank_id),
    INDEX idx_promise (donation_promise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS remember_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    account_type ENUM('admin','user','blood_bank') NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expiry_alert (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blood_bank_id INT,
    blood_bag_id INT,
    days_until_expiry INT,
    alert_sent_at DATETIME,
    resolved_at DATETIME,
    action_taken VARCHAR(255),
    INDEX idx_blood_bank (blood_bank_id),
    INDEX idx_blood_bag (blood_bag_id),
    INDEX idx_resolved (resolved_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS donor_rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_user_id INT NOT NULL,
    milestone INT,
    tier INT,
    reward_type VARCHAR(50),
    coupon_code VARCHAR(100),
    redeemed_at DATETIME,
    INDEX idx_donor (donor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fix existing NULL total_donations (signup.php previously omitted this column)
UPDATE donor_recipient SET total_donations = 0 WHERE total_donations IS NULL;
