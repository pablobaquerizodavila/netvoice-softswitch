-- Netvoice Softswitch - Modelo de base de datos v1.0
-- Motor: MySQL 8.0+

CREATE DATABASE IF NOT EXISTS netvoice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE netvoice;

CREATE TABLE partners (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(120) NOT NULL,
  api_key CHAR(64) NOT NULL UNIQUE,
  webhook_url VARCHAR(500) NULL,
  status ENUM('active','suspended','deleted') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_partners_api_key (api_key),
  INDEX idx_partners_status (status)
) ENGINE=InnoDB;

CREATE TABLE users (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  partner_id CHAR(36) NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','agent','partner','client') NOT NULL,
  status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_partner_id (partner_id),
  CONSTRAINT fk_users_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE clients (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  partner_id CHAR(36) NULL,
  created_by_user CHAR(36) NULL,
  name VARCHAR(180) NOT NULL,
  ruc VARCHAR(20) NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  plan_type ENUM('prepaid','postpaid') NOT NULL DEFAULT 'prepaid',
  credit_limit DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  balance DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  status ENUM('pending','active','suspended','cancelled') NOT NULL DEFAULT 'pending',
  origin ENUM('self_service','agent','api') NOT NULL DEFAULT 'self_service',
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  email_verify_token VARCHAR(128) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_clients_email (email),
  INDEX idx_clients_status (status),
  INDEX idx_clients_partner_id (partner_id),
  INDEX idx_clients_origin (origin),
  CONSTRAINT fk_clients_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_clients_created_by FOREIGN KEY (created_by_user) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE contracts (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  client_id CHAR(36) NOT NULL UNIQUE,
  doc_version VARCHAR(20) NOT NULL,
  doc_hash CHAR(64) NOT NULL,
  acceptance_token CHAR(64) NULL,
  signed_via ENUM('otp_email','otp_sms','api_token','agent') NOT NULL DEFAULT 'otp_email',
  ip_address VARCHAR(45) NOT NULL,
  storage_url VARCHAR(500) NULL,
  signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_contracts_client (client_id),
  CONSTRAINT fk_contracts_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payments (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  client_id CHAR(36) NOT NULL,
  gateway ENUM('payphone','stripe','transfer','manual') NOT NULL,
  gateway_ref VARCHAR(200) NULL,
  amount DECIMAL(10,4) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  concept ENUM('activation','recharge','monthly') NOT NULL DEFAULT 'activation',
  status ENUM('pending','approved','failed','refunded') NOT NULL DEFAULT 'pending',
  gateway_payload JSON NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_payments_client (client_id),
  INDEX idx_payments_status (status),
  INDEX idx_payments_gateway (gateway, gateway_ref),
  CONSTRAINT fk_payments_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE trunks (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  partner_id CHAR(36) NULL,
  carrier VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  host VARCHAR(255) NOT NULL,
  port SMALLINT NOT NULL DEFAULT 5060,
  transport ENUM('udp','tcp','tls') NOT NULL DEFAULT 'udp',
  username VARCHAR(80) NULL,
  password_hash VARCHAR(255) NULL,
  max_channels SMALLINT NOT NULL DEFAULT 30,
  cps_limit TINYINT NOT NULL DEFAULT 10,
  priority TINYINT NOT NULL DEFAULT 1,
  cost_per_min DECIMAL(8,6) NOT NULL DEFAULT 0.000000,
  status ENUM('active','inactive','maintenance') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_trunks_status (status),
  INDEX idx_trunks_priority (priority),
  INDEX idx_trunks_partner_id (partner_id),
  CONSTRAINT fk_trunks_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE did_pool (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  partner_id CHAR(36) NULL,
  number VARCHAR(20) NOT NULL UNIQUE,
  country_code CHAR(2) NOT NULL DEFAULT 'EC',
  city VARCHAR(80) NULL,
  status ENUM('available','reserved','assigned','ported_out') NOT NULL DEFAULT 'available',
  reserved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_did_pool_status (status),
  INDEX idx_did_pool_partner_id (partner_id),
  INDEX idx_did_pool_number (number),
  CONSTRAINT fk_did_pool_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE did_assignments (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  client_id CHAR(36) NOT NULL,
  did_id CHAR(36) NOT NULL,
  changed_by CHAR(36) NULL,
  changed_by_role ENUM('system','admin','partner','agent') NOT NULL DEFAULT 'system',
  previous_number VARCHAR(20) NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 1,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_did_assignments_client (client_id),
  INDEX idx_did_assignments_did (did_id),
  INDEX idx_did_assignments_current (client_id, is_current),
  CONSTRAINT fk_did_assign_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_did_assign_did FOREIGN KEY (did_id) REFERENCES did_pool(id) ON UPDATE CASCADE,
  CONSTRAINT fk_did_assign_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sip_credentials (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  client_id CHAR(36) NOT NULL UNIQUE,
  trunk_id CHAR(36) NOT NULL,
  sip_user VARCHAR(60) NOT NULL UNIQUE,
  sip_password_hash VARCHAR(255) NOT NULL,
  sip_password_plain VARCHAR(60) NOT NULL,
  realm VARCHAR(255) NOT NULL,
  allowed_ip VARCHAR(45) NULL,
  codec_list VARCHAR(100) NOT NULL DEFAULT 'ulaw,alaw,g729',
  max_channels TINYINT NOT NULL DEFAULT 2,
  status ENUM('active','suspended','revoked') NOT NULL DEFAULT 'active',
  last_register_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_sip_creds_client (client_id),
  INDEX idx_sip_creds_sip_user (sip_user),
  INDEX idx_sip_creds_status (status),
  CONSTRAINT fk_sip_creds_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sip_creds_trunk FOREIGN KEY (trunk_id) REFERENCES trunks(id) ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cdr (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  client_id CHAR(36) NOT NULL,
  trunk_id CHAR(36) NULL,
  asterisk_uid VARCHAR(80) NULL UNIQUE,
  caller VARCHAR(30) NOT NULL,
  callee VARCHAR(30) NOT NULL,
  direction ENUM('inbound','outbound','internal') NOT NULL,
  duration_sec INT NOT NULL DEFAULT 0,
  billsec INT NOT NULL DEFAULT 0,
  disposition ENUM('answered','no_answer','busy','failed') NOT NULL,
  cost DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
  rate DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
  call_start DATETIME NOT NULL,
  call_end DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cdr_client (client_id),
  INDEX idx_cdr_trunk (trunk_id),
  INDEX idx_cdr_call_start (call_start),
  INDEX idx_cdr_direction (direction),
  CONSTRAINT fk_cdr_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_cdr_trunk FOREIGN KEY (trunk_id) REFERENCES trunks(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW v_client_active_line AS
SELECT c.id AS client_id, c.name AS client_name, c.email, c.plan_type,
  c.status AS client_status, c.origin, dp.number AS did_number,
  sc.sip_user, sc.realm, sc.allowed_ip, sc.codec_list, sc.max_channels,
  sc.status AS sip_status, sc.last_register_at, t.carrier, t.host AS trunk_host, p.name AS partner_name
FROM clients c
LEFT JOIN did_assignments da ON da.client_id = c.id AND da.is_current = 1
LEFT JOIN did_pool dp ON dp.id = da.did_id
LEFT JOIN sip_credentials sc ON sc.client_id = c.id
LEFT JOIN trunks t ON t.id = sc.trunk_id
LEFT JOIN partners p ON p.id = c.partner_id;
