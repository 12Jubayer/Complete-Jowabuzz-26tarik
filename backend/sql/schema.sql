CREATE DATABASE IF NOT EXISTS jowabuzz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jowabuzz;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type ENUM('deposit', 'withdraw', 'bonus', 'adjustment') NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  method VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_transactions_user_id (user_id),
  INDEX idx_transactions_type_status (type, status),
  INDEX idx_transactions_created_at (created_at),
  INDEX idx_transactions_approved_at (approved_at)
);
