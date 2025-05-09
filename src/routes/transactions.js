const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Transfer money
router.post('/transfer', authMiddleware, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { recipientAccount, amount, description } = req.body;
        const userId = req.user.userId;

        // Get sender's account
        const [senderAccounts] = await connection.query(
            'SELECT * FROM accounts WHERE user_id = ?',
            [userId]
        );

        if (senderAccounts.length === 0) {
            throw new Error('Sender account not found');
        }

        const senderAccount = senderAccounts[0];

        // Check sufficient balance
        if (senderAccount.balance < amount) {
            throw new Error('Insufficient balance');
        }

        // Get recipient's account
        const [recipientAccounts] = await connection.query(
            'SELECT * FROM accounts WHERE account_number = ?',
            [recipientAccount]
        );

        if (recipientAccounts.length === 0) {
            throw new Error('Recipient account not found');
        }

        const recipientAccountData = recipientAccounts[0];

        // Update sender's balance
        await connection.query(
            'UPDATE accounts SET balance = balance - ? WHERE id = ?',
            [amount, senderAccount.id]
        );

        // Update recipient's balance
        await connection.query(
            'UPDATE accounts SET balance = balance + ? WHERE id = ?',
            [amount, recipientAccountData.id]
        );

        // Record transaction
        await connection.query(
            'INSERT INTO transactions (from_account_id, to_account_id, amount, transaction_type, description) VALUES (?, ?, ?, ?, ?)',
            [senderAccount.id, recipientAccountData.id, amount, 'transfer', description]
        );

        await connection.commit();
        res.json({ message: 'Transfer successful' });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
});

// Get recent transactions
router.get('/recent', authMiddleware, async (req, res) => {
    try {
        const [accounts] = await pool.query(
            'SELECT id FROM accounts WHERE user_id = ?',
            [req.user.userId]
        );

        if (accounts.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const accountId = accounts[0].id;

        const [transactions] = await pool.query(
            `SELECT t.*, 
                    a1.account_number as sender_account,
                    a2.account_number as recipient_account,
                    a2.user_id as recipient_id
             FROM transactions t
             JOIN accounts a1 ON t.from_account_id = a1.id
             JOIN accounts a2 ON t.to_account_id = a2.id
             WHERE t.from_account_id = ? OR t.to_account_id = ?
             ORDER BY t.created_at DESC
             LIMIT 10`,
            [accountId, accountId]
        );

        res.json({ transactions });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get transaction history with filters
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const { type = 'all', days = 'all' } = req.query;
        
        // Get user's account
        const [accounts] = await pool.query(
            'SELECT id FROM accounts WHERE user_id = ?',
            [req.user.userId]
        );

        if (accounts.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const accountId = accounts[0].id;
        
        // Build the query based on filters
        let query = `
            SELECT t.*, 
                   a1.account_number as sender_account,
                   a2.account_number as recipient_account,
                   ? as current_account_id
            FROM transactions t
            JOIN accounts a1 ON t.from_account_id = a1.id
            JOIN accounts a2 ON t.to_account_id = a2.id
            WHERE 1=1
        `;
        
        const queryParams = [accountId];

        // Add type filter
        if (type === 'sent') {
            query += ' AND t.from_account_id = ?';
            queryParams.push(accountId);
        } else if (type === 'received') {
            query += ' AND t.to_account_id = ?';
            queryParams.push(accountId);
        } else {
            query += ' AND (t.from_account_id = ? OR t.to_account_id = ?)';
            queryParams.push(accountId, accountId);
        }

        // Add date filter
        if (days !== 'all') {
            query += ' AND t.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            queryParams.push(parseInt(days));
        }

        // Add sorting
        query += ' ORDER BY t.created_at DESC';

        const [transactions] = await pool.query(query, queryParams);

        res.json({ transactions });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 