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

// Load user profile and accounts
async function loadProfile() {
    try {
        // Load user profile
        const profileResponse = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const profileData = await profileResponse.json();

        if (profileResponse.ok) {
            // Fill personal information
            document.getElementById('fullName').value = profileData.full_name;
            document.getElementById('email').value = profileData.email;
            document.getElementById('username').value = profileData.username;
        } else {
            alert(profileData.message || 'Failed to load profile');
        }

        // Load accounts
        const accountsResponse = await fetch('/api/auth/accounts', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const accountsData = await accountsResponse.json();

        if (accountsResponse.ok) {
            displayAccounts(accountsData.accounts);
        } else {
            alert(accountsData.message || 'Failed to load accounts');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while loading profile');
    }
}

// Display accounts
function displayAccounts(accounts) {
    const accountsList = document.getElementById('accountsList');
    
    if (!accounts || accounts.length === 0) {
        accountsList.innerHTML = '<p class="no-accounts">No accounts found</p>';
        return;
    }

    const accountsHTML = accounts.map(account => `
        <div class="account-card">
            <div class="account-info">
                <h3>${account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)} Account</h3>
                <p class="account-number">Account Number: ${account.account_number}</p>
                <p class="account-balance">Balance: $${account.balance.toFixed(2)}</p>
                <p class="account-created">Created: ${new Date(account.created_at).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');

    accountsList.innerHTML = accountsHTML;
}

// Handle add account button
document.getElementById('addAccountBtn').addEventListener('click', () => {
    document.getElementById('addAccountForm').style.display = 'block';
});

// Handle cancel button
document.getElementById('cancelAccountBtn').addEventListener('click', () => {
    document.getElementById('addAccountForm').style.display = 'none';
    document.getElementById('createAccountForm').reset();
});

// Handle create account form
document.getElementById('createAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        // Validate form data
        const accountData = {
            accountHolder: document.getElementById('accountHolder').value.trim(),
            accountNumber: document.getElementById('accountNumber').value.trim(),
            accountType: document.getElementById('accountType').value,
            branchName: document.getElementById('branchName').value.trim(),
            ifscCode: document.getElementById('ifscCode').value.trim().toUpperCase(),
            phoneNumber: document.getElementById('phoneNumber').value.trim(),
            upiId: document.getElementById('upiId').value.trim() || null
        };

        // Client-side validation
        if (!/^\d{10,16}$/.test(accountData.accountNumber)) {
            throw new Error('Account number must be between 10 and 16 digits');
        }

        if (!/^[A-Z]{4}[0-9]{7}$/.test(accountData.ifscCode)) {
            throw new Error('IFSC code must be in format ABCD0123456');
        }

        if (!/^\d{10}$/.test(accountData.phoneNumber)) {
            throw new Error('Phone number must be exactly 10 digits');
        }

        if (accountData.upiId && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z]{2,64}$/.test(accountData.upiId)) {
            throw new Error('Invalid UPI ID format (e.g., username@bank)');
        }

        const response = await fetch('/api/auth/accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(accountData)
        });

        const data = await response.json();

        if (response.ok) {
            alert('Account request submitted successfully');
            document.getElementById('addAccountForm').style.display = 'none';
            document.getElementById('createAccountForm').reset();
            loadProfile(); // Reload accounts
        } else {
            throw new Error(data.message || 'Failed to submit account request');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'An error occurred while submitting account request');
    }
});

// Update profile
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                fullName,
                email
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Profile updated successfully');
        } else {
            alert(data.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while updating profile');
    }
});

// Change password
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Password changed successfully');
            document.getElementById('passwordForm').reset();
        } else {
            alert(data.message || 'Failed to change password');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while changing password');
    }
});

// Load profile when page loads
loadProfile(); 