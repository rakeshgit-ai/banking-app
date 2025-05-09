const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Register route
router.post('/register', async (req, res) => {
    try {
        const { username, password, email, fullName } = req.body;

        // Check if user already exists
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await pool.query(
            'INSERT INTO users (username, password, email, full_name) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, email, fullName]
        );

        // Create initial account for user with $1000 balance
        const accountNumber = Math.floor(Math.random() * 9000000000) + 1000000000;
        await pool.query(
            'INSERT INTO accounts (user_id, account_number, balance) VALUES (?, ?, ?)',
            [result.insertId, accountNumber.toString(), 1000.00]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Get user
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get account balance
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const [accounts] = await pool.query(
            'SELECT account_number, balance FROM accounts WHERE user_id = ?',
            [req.user.userId]
        );

        if (accounts.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json({ 
            account_number: accounts[0].account_number,
            balance: accounts[0].balance 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get account details
router.get('/account', authMiddleware, async (req, res) => {
    try {
        const [accounts] = await pool.query(
            `SELECT a.*, u.username, u.email, u.full_name 
             FROM accounts a 
             JOIN users u ON a.user_id = u.id 
             WHERE a.user_id = ?`,
            [req.user.userId]
        );

        if (accounts.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const account = accounts[0];
        res.json({
            account_number: account.account_number,
            balance: account.balance,
            username: account.username,
            email: account.email,
            full_name: account.full_name
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT u.username, u.email, u.full_name, 
                    a.account_number, a.balance, a.account_type
             FROM users u
             JOIN accounts a ON u.id = a.user_id
             WHERE u.id = ?`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { fullName, email } = req.body;

        // Check if email is already in use by another user
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, req.user.userId]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email is already in use' });
        }

        // Update user information
        await pool.query(
            'UPDATE users SET full_name = ?, email = ? WHERE id = ?',
            [fullName, email, req.user.userId]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Change password
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get user's current password
        const [users] = await pool.query(
            'SELECT password FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.user.userId]
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all user accounts
router.get('/accounts', authMiddleware, async (req, res) => {
    try {
        const [accounts] = await pool.query(
            `SELECT account_number, balance, account_type, created_at
             FROM accounts
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.userId]
        );

        res.json({ accounts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new account request
router.post('/accounts', authMiddleware, async (req, res) => {
    try {
        const {
            accountHolder,
            accountNumber,
            accountType,
            branchName,
            ifscCode,
            phoneNumber,
            upiId
        } = req.body;

        // Validate account type
        const validAccountTypes = ['savings', 'checking', 'salary', 'fixed'];
        if (!validAccountTypes.includes(accountType)) {
            throw new Error('Invalid account type');
        }

        // Validate account number format
        if (!/^\d{10,16}$/.test(accountNumber)) {
            throw new Error('Invalid account number format');
        }

        // Validate IFSC code format
        if (!/^[A-Z]{4}[0-9]{7}$/.test(ifscCode)) {
            throw new Error('Invalid IFSC code format');
        }

        // Validate phone number
        if (!/^\d{10}$/.test(phoneNumber)) {
            throw new Error('Invalid phone number format');
        }

        // Validate UPI ID if provided
        if (upiId && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z]{2,64}$/.test(upiId)) {
            throw new Error('Invalid UPI ID format');
        }

        // Check if account number already exists
        const [existingAccounts] = await pool.query(
            'SELECT id FROM accounts WHERE account_number = ?',
            [accountNumber]
        );

        if (existingAccounts.length > 0) {
            throw new Error('Account number already exists');
        }

        // Create account with the provided details
        const [result] = await pool.query(
            `INSERT INTO accounts (
                user_id, 
                account_holder, 
                account_number, 
                account_type, 
                branch_name, 
                ifsc_code, 
                phone_number, 
                upi_id, 
                balance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.userId,
                accountHolder,
                accountNumber,
                accountType,
                branchName,
                ifscCode,
                phoneNumber,
                upiId,
                0 // Initial balance
            ]
        );

        res.status(201).json({ 
            message: 'Account request submitted successfully',
            account: {
                id: result.insertId,
                accountHolder,
                accountNumber,
                accountType,
                branchName,
                ifscCode,
                phoneNumber,
                upiId,
                balance: 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 