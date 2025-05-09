// Check if user is logged in
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/index.html';
}

// Load account balance
async function loadBalance() {
    try {
        const response = await fetch('/api/auth/balance', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('currentBalance').textContent = `Current Balance: $${data.balance.toFixed(2)}`;
            document.getElementById('accountNumber').textContent = `Account Number: ${data.account_number}`;
        } else {
            console.error('Failed to load balance');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Logout function
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
});

// Handle transfer form submission
document.getElementById('transferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const recipientAccount = document.getElementById('recipientAccount').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;

    try {
        const response = await fetch('/api/transactions/transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                recipientAccount,
                amount,
                description
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Transfer successful!');
            loadBalance(); // Refresh balance after transfer
            loadRecentTransfers();
            document.getElementById('transferForm').reset();
        } else {
            alert(data.message || 'Transfer failed. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again later.');
    }
});

// Load recent transfers
async function loadRecentTransfers() {
    try {
        const response = await fetch('/api/transactions/recent', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayRecentTransfers(data.transactions);
        } else {
            console.error('Failed to load recent transfers');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Display recent transfers
function displayRecentTransfers(transactions) {
    const transfersList = document.getElementById('recentTransfersList');
    
    if (!transactions || transactions.length === 0) {
        transfersList.innerHTML = '<p>No recent transfers</p>';
        return;
    }

    const transfersHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <p class="transaction-type">Transfer to ${transaction.recipient_account}</p>
                <p class="transaction-date">${new Date(transaction.created_at).toLocaleDateString()}</p>
                <p class="transaction-description">${transaction.description || 'No description'}</p>
            </div>
            <p class="transaction-amount amount-negative">
                -$${transaction.amount.toFixed(2)}
            </p>
        </div>
    `).join('');

    transfersList.innerHTML = transfersHTML;
}

// Load balance and recent transfers when page loads
loadBalance();
loadRecentTransfers(); 