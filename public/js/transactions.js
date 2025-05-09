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

// Get filter elements
const transactionTypeFilter = document.getElementById('transactionType');
const timeRangeFilter = document.getElementById('timeRange');

// Load transactions based on filters
async function loadTransactions() {
    try {
        const type = transactionTypeFilter.value;
        const days = timeRangeFilter.value;

        const response = await fetch(`/api/transactions/history?type=${type}&days=${days}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayTransactions(data.transactions);
        } else {
            console.error('Failed to load transactions');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Display transactions
function displayTransactions(transactions) {
    const transactionsList = document.getElementById('transactionsList');
    
    if (!transactions || transactions.length === 0) {
        transactionsList.innerHTML = '<p class="no-transactions">No transactions found</p>';
        return;
    }

    const transactionsHTML = transactions.map(transaction => {
        const isReceived = transaction.to_account_id === transaction.current_account_id;
        const amountClass = isReceived ? 'amount-positive' : 'amount-negative';
        const amountPrefix = isReceived ? '+' : '-';
        
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <p class="transaction-type">
                        ${isReceived 
                            ? `Received from ${transaction.sender_account}` 
                            : `Sent to ${transaction.recipient_account}`}
                    </p>
                    <p class="transaction-date">${new Date(transaction.created_at).toLocaleDateString()}</p>
                    <p class="transaction-description">${transaction.description || 'No description'}</p>
                </div>
                <p class="transaction-amount ${amountClass}">
                    ${amountPrefix}$${transaction.amount.toFixed(2)}
                </p>
            </div>
        `;
    }).join('');

    transactionsList.innerHTML = transactionsHTML;
}

// Add event listeners for filters
transactionTypeFilter.addEventListener('change', loadTransactions);
timeRangeFilter.addEventListener('change', loadTransactions);

// Load transactions when page loads
loadTransactions(); 