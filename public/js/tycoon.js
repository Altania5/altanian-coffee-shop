document.addEventListener('DOMContentLoaded', () => {
    const playerMoneyEl = document.getElementById('playerMoney');
    const ownedFarmsListEl = document.getElementById('ownedFarmsList');
    const ownedCafesListEl = document.getElementById('ownedCafesList');
    const inventoryListEl = document.getElementById('inventoryList');
    const farmOptionsListEl = document.getElementById('farmOptionsList');
    const gameMessagesEl = document.getElementById('gameMessages');
    const refreshStateButton = document.getElementById('refreshStateButton');
    const logoutButtonGame = document.getElementById('logoutButtonGame');
    
    const authMessageContainer = document.getElementById('authMessageContainer');
    const gameContent = document.getElementById('gameContent');

    async function checkAuthAndLoadGame() {
        try {
            // We can use an existing authenticated route or create a simple one
            const authResponse = await fetch('/dashboard'); // Or any route that checks session
            if (authResponse.ok) {
                const authData = await authResponse.json();
                if (authData.success && authData.user) {
                    console.log("User authenticated:", authData.user);
                    gameContent.style.display = 'block';
                    authMessageContainer.style.display = 'none';
                    fetchGameState();
                    fetchFarmOptions();
                } else {
                    throw new Error('User not properly authenticated');
                }
            } else {
                 throw new Error('Authentication check failed');
            }
        } catch (error) {
            console.error('Authentication/init error:', error);
            gameContent.style.display = 'none';
            authMessageContainer.textContent = 'You need to be logged in to play Global Brew Tycoon. Please log in or register.';
            authMessageContainer.style.display = 'block';
        }
    }


    async function fetchGameState(useTickedEndpoint = false) {
        const url = useTickedEndpoint ? '/api/game/tycoon/state/ticked' : '/api/game/tycoon/state';
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 401) {
                     gameContent.style.display = 'none';
                     authMessageContainer.textContent = 'Session expired or not authorized. Please log in again.';
                     authMessageContainer.style.display = 'block';
                     return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                updateUI(result.data);
            } else {
                showMessage(result.message || 'Could not fetch game state.', 'error');
            }
        } catch (error) {
            console.error('Error fetching game state:', error);
            showMessage('Failed to load game state.', 'error');
        }
    }

    async function fetchFarmOptions() {
        try {
            const response = await fetch('/api/game/tycoon/world/farm-options');
            const result = await response.json();
            if (result.success) {
                renderFarmOptions(result.data);
            } else {
                showMessage(result.message || 'Could not load farm options.', 'error');
            }
        } catch (error) {
            console.error('Error fetching farm options:', error);
        }
    }

    function renderFarmOptions(options) {
        farmOptionsListEl.innerHTML = '';
        if (!options || options.length === 0) {
            farmOptionsListEl.innerHTML = '<p>No farm options available currently.</p>';
            return;
        }
        options.forEach(option => {
            const button = document.createElement('button');
            button.innerHTML = `Invest in ${option.beanType} Farm (${option.regionName}) - Cost: $${option.costToInvest} (Yield: ${option.yieldPerCycle}kg / ${option.cycleDurationDays} days)`;
            button.dataset.farmOptionId = option.id;
            button.addEventListener('click', () => investInFarm(option.id));
            farmOptionsListEl.appendChild(button);
        });
    }

    async function investInFarm(farmOptionId) {
        try {
            const response = await fetch('/api/game/tycoon/action/invest-farm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ farmOptionId })
            });
            const result = await response.json();
            if (result.success) {
                showMessage(result.message || 'Farm investment successful!', 'success');
                updateUI(result.data); // Update UI with new state from response
            } else {
                showMessage(result.message || 'Farm investment failed.', 'error');
            }
        } catch (error) {
            console.error('Error investing in farm:', error);
            showMessage('An error occurred during farm investment.', 'error');
        }
    }

    function updateUI(data) {
        if (!data) {
            console.warn("No data provided to updateUI");
            return;
        }
        playerMoneyEl.textContent = data.money.toFixed(2);

        // Update Owned Farms
        ownedFarmsListEl.innerHTML = '';
        if (data.ownedFarms && data.ownedFarms.length > 0) {
            data.ownedFarms.forEach(farm => {
                const farmDiv = document.createElement('div');
                farmDiv.classList.add('farm-card');
                const progress = farm.cycleDuration > 0 ? ((Date.now() - new Date(farm.lastHarvestTime).getTime()) / farm.cycleDuration * 100) : 0;
                farmDiv.innerHTML = `
                    <h4>${farm.beanType} Farm in ${farm.regionName}</h4>
                    <p>Yield: ${farm.yieldPerCycle}kg | Cycle: ${(farm.cycleDuration / (1000 * 60 * 60 * 24)).toFixed(1)} days</p>
                    <p>Status: ${farm.isActive ? 'Active' : 'Inactive'}</p>
                    <p>Time to next harvest: ${Math.max(0, ( (new Date(farm.lastHarvestTime).getTime() + farm.cycleDuration) - Date.now()) / 1000 / 60).toFixed(0)} mins (approx)</p>
                    <div style="background: #eee; height: 10px; border-radius: 5px; margin-top: 5px;">
                         <div style="background: #4CAF50; height: 100%; width: ${Math.min(100, progress.toFixed(2))}%; border-radius: 5px;"></div>
                    </div>
                `;
                ownedFarmsListEl.appendChild(farmDiv);
            });
        } else {
            ownedFarmsListEl.innerHTML = '<p>No farms yet. Invest in one!</p>';
        }

        // Update Owned Cafes (similar structure)
        ownedCafesListEl.innerHTML = '';
        if (data.ownedCafes && data.ownedCafes.length > 0) {
            // ... render cafes ...
        } else {
            ownedCafesListEl.innerHTML = '<p>No cafes yet.</p>';
        }
        
        // Update Inventory
        inventoryListEl.innerHTML = '';
        if (data.inventory && Object.keys(data.inventory).length > 0) {
            for (const [item, quantity] of Object.entries(data.inventory)) {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('inventory-item');
                itemDiv.textContent = `${item}: ${quantity} kg`;
                inventoryListEl.appendChild(itemDiv);
            }
        } else {
            inventoryListEl.innerHTML = '<p>Your inventory is empty.</p>';
        }
    }

    function showMessage(message, type = 'info') {
        gameMessagesEl.textContent = message;
        gameMessagesEl.className = `message ${type}`; // Ensure your CSS has .message.success and .message.error
        setTimeout(() => { gameMessagesEl.textContent = ''; gameMessagesEl.className = 'message'; }, 5000);
    }
    
    if (refreshStateButton) {
        refreshStateButton.addEventListener('click', () => fetchGameState(true)); // Pass true to use ticked endpoint
    }

    if (logoutButtonGame) {
        logoutButtonGame.addEventListener('click', async () => {
            try {
                const response = await fetch('/logout'); // Assuming GET /logout
                const data = await response.json();
                if (data.success) {
                    window.location.href = '/'; // Redirect to login/home
                } else {
                    showMessage('Logout failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Logout error:', error);
                showMessage('An error occurred during logout.', 'error');
            }
        });
    }

    // Initial load
    checkAuthAndLoadGame();
});