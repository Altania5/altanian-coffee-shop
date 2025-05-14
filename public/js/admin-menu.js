document.addEventListener('DOMContentLoaded', () => {
    const addMenuItemForm = document.getElementById('addMenuItemForm');
    const editMenuItemForm = document.getElementById('editMenuItemForm');
    const editFormSection = document.getElementById('editFormSection');
    const cancelEditButton = document.getElementById('cancelEdit');
    const menuItemsTableBody = document.getElementById('menuItemsTableBody');
    const addMessage = document.getElementById('addMessage');
    const editMessage = document.getElementById('editMessage');
    const listMessage = document.getElementById('listMessage');
    const logoutButton = document.getElementById('logoutButton');

    const authMessageContainer = document.getElementById('authMessageContainer');
    const adminContent = document.getElementById('adminContent');

    let currentEditItemId = null;

    // --- Authentication Check ---
    async function checkAdminAuth() {
        try {
            const response = await fetch('/dashboard'); // Uses existing authenticated route
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user && data.user.role === 'admin') {
                    adminContent.style.display = 'block';
                    authMessageContainer.style.display = 'none';
                    loadMenuItems(); // Load items only if admin
                } else {
                    throw new Error('Not an admin or session invalid');
                }
            } else {
                throw new Error('Authentication check failed');
            }
        } catch (error) {
            console.error('Admin auth check failed:', error);
            adminContent.style.display = 'none';
            authMessageContainer.textContent = 'Access Denied. You must be an admin. Please log in as an admin.';
            authMessageContainer.style.display = 'block';
            // setTimeout(() => window.location.href = '/', 3000); // Optional redirect
        }
    }

    // --- Load Menu Items ---
    async function loadMenuItems() {
        try {
            const response = await fetch('/api/menu');
            const result = await response.json();
            if (result.success && result.data) {
                renderMenuItems(result.data);
            } else {
                showMessage(listMessage, result.message || 'Could not load menu items.', 'error');
            }
        } catch (error) {
            console.error('Error loading menu items:', error);
            showMessage(listMessage, 'Failed to load menu items.', 'error');
        }
    }

    // --- Render Menu Items in Table ---
    function renderMenuItems(items) {
        menuItemsTableBody.innerHTML = '';
        if (items.length === 0) {
            menuItemsTableBody.innerHTML = '<tr><td colspan="5">No menu items found.</td></tr>';
            return;
        }
        items.forEach(item => {
            const row = menuItemsTableBody.insertRow();
            row.innerHTML = `
                <td><span class="math-inline">\{item\.name\}</td\><td>parseFloat(item.price).toFixed(2)</td><td>{item.category || ''}</td>
<td>item.isAvailable? 
′
 Yes 
′
 : 
′
 No 
′
 </td><tdclass="action−buttons"><buttonclass="edit−btn"data−id="{item._id}">Edit</button>
<button class="delete-btn" data-id="item. 
i
​
 d"data−name="{item.name}">Delete</button>
</td>
`;
});
}    // --- Add New Menu Item ---
    addMenuItemForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const itemData = {
            name: document.getElementById('addName').value,
            description: document.getElementById('addDescription').value,
            price: parseFloat(document.getElementById('addPrice').value),
            category: document.getElementById('addCategory').value,
            imageUrl: document.getElementById('addImageUrl').value,
            isAvailable: document.getElementById('addIsAvailable').checked
        };

        try {
            const response = await fetch('/api/menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });
            const result = await response.json();
            if (result.success) {
                showMessage(addMessage, 'Item added successfully!', 'success');
                addMenuItemForm.reset();
                loadMenuItems(); // Refresh list
            } else {
                showMessage(addMessage, result.message || 'Failed to add item.', 'error');
            }
        } catch (error) {
            console.error('Error adding item:', error);
            showMessage(addMessage, 'An error occurred.', 'error');
        }
    });

    // --- Edit Menu Item ---
    // Event delegation for edit buttons
    menuItemsTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('edit-btn')) {
            currentEditItemId = event.target.dataset.id;
            try {
                const response = await fetch(`/api/menu/${currentEditItemId}`);
                const result = await response.json();
                if (result.success && result.data) {
                    populateEditForm(result.data);
                } else {
                    showMessage(listMessage, 'Could not fetch item details for editing.', 'error');
                }
            } catch (error) {
                console.error('Error fetching item for edit:', error);
                showMessage(listMessage, 'Error fetching item details.', 'error');
            }
        }
    });

    function populateEditForm(item) {
        document.getElementById('editItemId').value = item._id;   document.getElementById('editName').value = item.name;
document.getElementById('editDescription').value = item.description || '';
document.getElementById('editPrice').value = item.price;
document.getElementById('editCategory').value = item.category || '';
document.getElementById('editImageUrl').value = item.imageUrl || '';
document.getElementById('editIsAvailable').checked = item.isAvailable;
editFormSection.style.display = 'block';
addMessage.textContent = ''; // Clear add form message
editMessage.textContent = ''; // Clear previous edit messages
window.scrollTo(0, editFormSection.offsetTop - 20); // Scroll to edit form
}  editMenuItemForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const itemId = document.getElementById('editItemId').value;
        const itemData = {
            name: document.getElementById('editName').value,
            description: document.getElementById('editDescription').value,
            price: parseFloat(document.getElementById('editPrice').value),
            category: document.getElementById('editCategory').value,
            imageUrl: document.getElementById('editImageUrl').value,
            isAvailable: document.getElementById('editIsAvailable').checked
        };

        try {
            const response = await fetch(`/api/menu/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });
            const result = await response.json();
            if (result.success) {
                showMessage(editMessage, 'Item updated successfully!', 'success');
                editFormSection.style.display = 'none';
                editMenuItemForm.reset();
                currentEditItemId = null;
                loadMenuItems(); // Refresh list
            } else {
                showMessage(editMessage, result.message || 'Failed to update item.', 'error');
            }
        } catch (error) {
            console.error('Error updating item:', error);
            showMessage(editMessage, 'An error occurred.', 'error');
        }
    });

    cancelEditButton.addEventListener('click', () => {
        editFormSection.style.display = 'none';
        editMenuItemForm.reset();
        currentEditItemId = null;
        editMessage.textContent = '';
    });

    // --- Delete Menu Item ---
    // Event delegation for delete buttons
    menuItemsTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const itemId = event.target.dataset.id;
            const itemName = event.target.dataset.name;
            if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
                try {
                    const response = await fetch(`/api/menu/${itemId}`, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    if (result.success) {
                        showMessage(listMessage, `"${itemName}" deleted successfully!`, 'success');
                        loadMenuItems(); // Refresh list
                    } else {
                        showMessage(listMessage, result.message || 'Failed to delete item.', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting item:', error);
                    showMessage(listMessage, 'An error occurred during deletion.', 'error');
                }
            }
        }
    });

    // --- Logout ---
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/logout');
                const data = await response.json();
                if (data.success) {
                    window.location.href = '/'; // Redirect to login/home
                } else {
                    alert('Logout failed. Please try again.');
                }
            } catch (error) {
                console.error('Logout error:', error);
                alert('An error occurred during logout.');
            }
        });
    }
    
    // --- Helper to show messages ---
    function showMessage(element, message, type = 'info') {
        element.textContent = message;
        element.className = `message ${type}`; // type can be 'success' or 'error'
        setTimeout(() => { element.textContent = ''; element.className = 'message';}, 5000);
    }

    // --- Initial Load ---
    checkAdminAuth();
});