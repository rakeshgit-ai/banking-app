// Check if user is logged in
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/index.html';
}

// Logout function
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
});

// Fetch user data and account information
async function fetchDashboardData() {
    try {
        const response = await fetch('/api/user/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        
        // Update UI with user data
        document.getElementById('userName').textContent = data.fullName;
        document.getElementById('accountBalance').textContent = `$${data.balance.toFixed(2)}`;
        document.getElementById('accountNumber').textContent = `Account: ${data.accountNumber}`;
        
        // Load recent transactions
        loadRecentTransactions(data.recentTransactions);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load dashboard data');
    }
}

// Load recent transactions
function loadRecentTransactions(transactions) {
    const transactionsList = document.getElementById('transactionsList');
    
    if (!transactions || transactions.length === 0) {
        transactionsList.innerHTML = '<p>No recent transactions</p>';
        return;
    }

    const transactionsHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <p class="transaction-type">${transaction.type}</p>
                <p class="transaction-date">${new Date(transaction.created_at).toLocaleDateString()}</p>
            </div>
            <p class="transaction-amount ${transaction.type === 'deposit' ? 'amount-positive' : 'amount-negative'}">
                ${transaction.type === 'deposit' ? '+' : '-'}$${transaction.amount.toFixed(2)}
            </p>
        </div>
    `).join('');

    transactionsList.innerHTML = transactionsHTML;
}

// Load dashboard data when page loads
fetchDashboardData(); 