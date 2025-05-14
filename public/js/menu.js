document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menuContainer'); // Is 'menuContainer' the correct ID from your HTML?

    async function fetchAndDisplayMenu() {
        console.log("fetchAndDisplayMenu called"); // Add this for debugging
        if (!menuContainer) {
            console.error("Error: menuContainer element not found!");
            return;
        }
        menuContainer.innerHTML = '<p class="loading">Fetching menu items...</p>'; // Update loading message

        try {
            const response = await fetch('/api/menu');
            console.log("API response received:", response); // Debug

            if (!response.ok) {
                const errorText = await response.text(); // Get more details on the error
                console.error("API response not OK:", response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            const result = await response.json();
            console.log("API result parsed:", result); // Debug

            if (result.success && result.data) {
                displayMenuItems(result.data);
            } else {
                console.error("API result not successful or data missing:", result);
                showError(result.message || 'Could not load menu items from API response.');
            }
        } catch (error) {
            console.error('Error in fetchAndDisplayMenu:', error);
            showError('Failed to fetch menu. Please check console for details.');
        }
    }

    function displayMenuItems(items) {
        console.log("displayMenuItems called with items:", items); // Debug
        if (!menuContainer) return; // Should have been caught earlier but good check

        menuContainer.innerHTML = ''; // Clear loading message or previous items

        if (items.length === 0) {
            menuContainer.innerHTML = '<p>No menu items available at the moment.</p>';
            return;
        }

        items.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('menu-item-card');
            // ... (rest of card creation logic from previous response) ...
            let imageHtml = '';
            if (item.imageUrl) {
                imageHtml = `<img src="${item.imageUrl}" alt="${item.name}">`;
            }
            const availabilityHtml = item.isAvailable
                ? `<span class="price">$${parseFloat(item.price).toFixed(2)}</span>`
                : `<span class="not-available">Currently unavailable</span>`;
            card.innerHTML = `
                ${imageHtml}
                <h3>${item.name}</h3>
                ${item.category ? `<p class="category">Category: ${item.category}</p>` : ''}
                <p>${item.description || 'No description available.'}</p>
                <p>${availabilityHtml}</p>
            `;
            menuContainer.appendChild(card);
        });
    }

    function showError(message) {
        console.log("showError called with message:", message); // Debug
        if (menuContainer) {
            menuContainer.innerHTML = `<p class="error-message">${message}</p>`;
        } else {
            console.error("Cannot show error, menuContainer not found. Error was:", message);
        }
    }

    fetchAndDisplayMenu(); // Initial call
});