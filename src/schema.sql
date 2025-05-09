-- Drop existing tables if they exist
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create accounts table
CREATE TABLE accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    account_number VARCHAR(16) UNIQUE NOT NULL,
    account_type ENUM('savings', 'checking', 'salary', 'fixed') NOT NULL,
    branch_name VARCHAR(100) NOT NULL,
    ifsc_code CHAR(11) NOT NULL,
    phone_number CHAR(10) NOT NULL,
    upi_id VARCHAR(255),
    balance DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
); 