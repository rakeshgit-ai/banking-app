console.log('test');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function setupDatabase() {
    // First create a connection without database selected
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD
    });

    try {
        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'banking_app'}`);
        console.log('Database created or already exists');

        // Use the database
        await connection.query(`USE ${process.env.DB_NAME || 'banking_app'}`);

        // Create tables
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                account_number VARCHAR(20) UNIQUE NOT NULL,
                balance DECIMAL(10, 2) DEFAULT 0.00,
                account_type ENUM('savings', 'checking') DEFAULT 'savings',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                from_account_id INT NOT NULL,
                to_account_id INT NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                transaction_type ENUM('transfer', 'deposit', 'withdrawal') NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_account_id) REFERENCES accounts(id),
                FOREIGN KEY (to_account_id) REFERENCES accounts(id)
            )
        `);

        console.log('Tables created successfully');
    } catch (error) {
        console.error('Error setting up database:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

setupDatabase().then(() => {
    console.log('Database setup completed');
    process.exit(0);
});