-- Add role column to users table
ALTER TABLE users ADD COLUMN role ENUM('admin', 'user') DEFAULT 'user' AFTER email;
