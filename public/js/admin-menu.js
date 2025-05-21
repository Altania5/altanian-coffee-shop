document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const navMenuManagement = document.getElementById('navMenuManagement');
    const navInventoryManagement = document.getElementById('navInventoryManagement');
    const menuManagementSection = document.getElementById('menuManagementSection');
    const inventoryManagementSection = document.getElementById('inventoryManagementSection');

    // Common Admin Elements
    const authMessageContainer = document.getElementById('authMessageContainer');
    const adminContent = document.getElementById('adminContent');
    const logoutButton = document.getElementById('logoutButton');

    // Menu Management Elements
    const addMenuItemForm = document.getElementById('addMenuItemForm');
    const editMenuItemForm = document.getElementById('editMenuItemForm');
    const editMenuItemFormSection = document.getElementById('editMenuItemFormSection');
    const cancelEditMenuItemButton = document.getElementById('cancelEditMenuItem'); // Ensure this ID matches HTML
    const menuItemsTableBody = document.getElementById('menuItemsTableBody');
    const addMenuMessage = document.getElementById('addMenuMessage');
    const editMenuMessage = document.getElementById('editMenuMessage');
    const listMenuMessage = document.getElementById('listMenuMessage');
    let currentEditMenuItemId = null;

    // Inventory Management Elements
    const addInventoryItemForm = document.getElementById('addInventoryItemForm');
    const editInventoryItemForm = document.getElementById('editInventoryItemForm');
    const editInventoryItemFormSection = document.getElementById('editInventoryItemFormSection');
    const cancelEditInventoryItemButton = document.getElementById('cancelEditInventoryItem');
    const inventoryItemsTableBody = document.getElementById('inventoryItemsTableBody');
    const addInventoryMessage = document.getElementById('addInventoryMessage');
    const editInventoryMessage = document.getElementById('editInventoryMessage');
    const listInventoryMessage = document.getElementById('listInventoryMessage');
    const invItemTypeSelect = document.getElementById('invItemType'); // For add form
    const editInvItemTypeSelect = document.getElementById('editInvItemType'); // For edit form
    let currentEditInventoryItemId = null;

    // Toggle visibility for sub-options in ADD form
    toggleSubOptions('addCfgAllowQuantity', 'addCfgQuantityOptions');
    toggleSubOptions('addCfgAllowEspresso', 'addCfgEspressoOptions');
    toggleSubOptions('addCfgAllowColdFoam', 'addCfgColdFoamOptions');

    // Toggle visibility for sub-options in EDIT form
    toggleSubOptions('editCfgAllowQuantity', 'editCfgQuantityOptions');
    toggleSubOptions('editCfgAllowEspresso', 'editCfgEspressoOptions');
    toggleSubOptions('editCfgAllowColdFoam', 'editCfgColdFoamOptions');


    // --- Authentication Check & Initial Setup ---
    async function checkAdminAuth() {
        try {
            const response = await fetch('/dashboard'); 
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user && data.user.role === 'admin') {
                    adminContent.style.display = 'block';
                    authMessageContainer.style.display = 'none';
                    showSection('menu'); // Show menu management by default
                    loadMenuItems();
                    loadInventoryItems(); // Load inventory items as well
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
        }
    }

    // --- Navigation Logic ---
    function showSection(sectionName) {
        menuManagementSection.classList.remove('active');
        inventoryManagementSection.classList.remove('active');
        navMenuManagement.style.fontWeight = 'normal';
        navInventoryManagement.style.fontWeight = 'normal';

        if (sectionName === 'menu') {
            menuManagementSection.classList.add('active');
            navMenuManagement.style.fontWeight = 'bold';
        } else if (sectionName === 'inventory') {
            inventoryManagementSection.classList.add('active');
            navInventoryManagement.style.fontWeight = 'bold';
        }
    }

    if (navMenuManagement) navMenuManagement.addEventListener('click', (e) => { e.preventDefault(); showSection('menu'); });
    if (navInventoryManagement) navInventoryManagement.addEventListener('click', (e) => { e.preventDefault(); showSection('inventory'); });

    function toggleSubOptions(checkboxId, subOptionsId) {
        const checkbox = document.getElementById(checkboxId);
        const subOptions = document.getElementById(subOptionsId);
        if (checkbox && subOptions) {
            subOptions.style.display = checkbox.checked ? 'block' : 'none';
            checkbox.addEventListener('change', () => {
                subOptions.style.display = checkbox.checked ? 'block' : 'none';
            });
        }
    }

    // --- Helper to show messages ---
    function showUserMessage(element, message, type = 'info') { // Renamed to avoid conflict
        if (element) {
            element.textContent = message;
            element.className = `message ${type}`;
            setTimeout(() => { element.textContent = ''; element.className = 'message'; }, 5000);
        } else {
            console.warn("Attempted to show message on a null element for message:", message);
        }
    }

    // --- Logout ---
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/logout');
                const data = await response.json();
                if (data.success) {
                    window.location.href = '/'; 
                } else {
                    alert('Logout failed. Please try again.');
                }
            } catch (error) {
                console.error('Logout error:', error);
                alert('An error occurred during logout.');
            }
        });
    }

    // --- Menu Management Logic (largely existing, ensure message elements are updated) ---
    async function loadMenuItems() {
        try {
            const response = await fetch('/api/menu');
            const result = await response.json();
            if (result.success && result.data) {
                renderMenuItems(result.data);
            } else {
                showUserMessage(listMenuMessage, result.message || 'Could not load menu items.', 'error');
            }
        } catch (error) {
            console.error('Error loading menu items:', error);
            showUserMessage(listMenuMessage, 'Failed to load menu items.', 'error');
        }
    }

    function renderMenuItems(items) {
        menuItemsTableBody.innerHTML = '';
        if (items.length === 0) {
            menuItemsTableBody.innerHTML = '<tr><td colspan="5">No menu items found.</td></tr>';
            return;
        }
        items.forEach(item => {
            const row = menuItemsTableBody.insertRow();
            row.innerHTML = `
                <td>${item.name}</td>
                <td>$${parseFloat(item.price).toFixed(2)}</td>
                <td>${item.category || ''}</td>
                <td>${item.isAvailable ? 'Yes' : 'No'}</td>
                <td class="action-buttons">
                    <button class="edit-menu-btn" data-id="${item._id}">Edit</button>
                    <button class="delete-menu-btn" data-id="${item._id}" data-name="${item.name}">Delete</button>
                </td>
            `;
        });
    }
    
    if (addMenuItemForm) {
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
                    showUserMessage(addMenuMessage, 'Menu item added successfully!', 'success');
                    addMenuItemForm.reset();
                    loadMenuItems(); 
                } else {
                    showUserMessage(addMenuMessage, result.message || 'Failed to add menu item.', 'error');
                }
            } catch (error) {
                console.error('Error adding menu item:', error);
                showUserMessage(addMenuMessage, 'An error occurred.', 'error');
            }
        });
    }

    menuItemsTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('edit-menu-btn')) {
            currentEditMenuItemId = event.target.dataset.id;
            try {
                const response = await fetch(`/api/menu/${currentEditMenuItemId}`);
                const result = await response.json();
                if (result.success && result.data) {
                    populateEditMenuItemForm(result.data);
                } else {
                    showUserMessage(listMenuMessage, 'Could not fetch menu item details for editing.', 'error');
                }
            } catch (error) {
                console.error('Error fetching menu item for edit:', error);
                showUserMessage(listMenuMessage, 'Error fetching menu item details.', 'error');
            }
        } else if (event.target.classList.contains('delete-menu-btn')) {
            const itemId = event.target.dataset.id;
            const itemName = event.target.dataset.name;
            if (confirm(`Are you sure you want to delete menu item "${itemName}"?`)) {
                try {
                    const response = await fetch(`/api/menu/${itemId}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (result.success) {
                        showUserMessage(listMenuMessage, `"${itemName}" deleted successfully!`, 'success');
                        loadMenuItems();
                    } else {
                        showUserMessage(listMenuMessage, result.message || 'Failed to delete menu item.', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting menu item:', error);
                    showUserMessage(listMenuMessage, 'An error occurred during deletion.', 'error');
                }
            }
        }
    });

    function populateEditMenuItemForm(item) {
        document.getElementById('editMenuItemId').value = item._id;
        document.getElementById('editName').value = item.name;
        document.getElementById('editDescription').value = item.description || '';
        document.getElementById('editPrice').value = item.price;
        document.getElementById('editCategory').value = item.category || '';
        document.getElementById('editImageUrl').value = item.imageUrl || '';
        document.getElementById('editIsAvailable').checked = item.isAvailable;
        editMenuItemFormSection.style.display = 'block';
        addMenuMessage.textContent = ''; 
        editMenuMessage.textContent = ''; 
        window.scrollTo(0, editMenuItemFormSection.offsetTop - 20); 
    }

    if(editMenuItemForm) {
        editMenuItemForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const itemId = document.getElementById('editMenuItemId').value;
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
                    showUserMessage(editMenuMessage, 'Menu item updated successfully!', 'success');
                    editMenuItemFormSection.style.display = 'none';
                    editMenuItemForm.reset();
                    currentEditMenuItemId = null;
                    loadMenuItems(); 
                } else {
                    showUserMessage(editMenuMessage, result.message || 'Failed to update menu item.', 'error');
                }
            } catch (error) {
                console.error('Error updating menu item:', error);
                showUserMessage(editMenuMessage, 'An error occurred.', 'error');
            }
        });
    }
    
    if (cancelEditMenuItemButton) {
        cancelEditMenuItemButton.addEventListener('click', () => {
            editMenuItemFormSection.style.display = 'none';
            editMenuItemForm.reset();
            currentEditMenuItemId = null;
            editMenuMessage.textContent = '';
        });
    }

    // --- Inventory Management Logic ---
    async function loadInventoryItems() {
        try {
            const response = await fetch('/api/inventory');
            const result = await response.json();
            if (result.success && result.data) {
                renderInventoryItems(result.data);
            } else {
                showUserMessage(listInventoryMessage, result.message || 'Could not load inventory items.', 'error');
            }
        } catch (error) {
            console.error('Error loading inventory items:', error);
            showUserMessage(listInventoryMessage, 'Failed to load inventory items.', 'error');
        }
    }

    function renderInventoryItems(items) {
        inventoryItemsTableBody.innerHTML = '';
        if (items.length === 0) {
            inventoryItemsTableBody.innerHTML = '<tr><td colspan="7">No inventory items found.</td></tr>';
            return;
        }
        items.forEach(item => {
            const row = inventoryItemsTableBody.insertRow();
            row.innerHTML = `
                <td>${item.itemName}</td>
                <td>${item.itemType}</td>
                <td>${item.unit}</td>
                <td>${item.quantityInStock}</td>
                <td>$${(item.pricePerUnitCharge || 0).toFixed(2)}</td>
                <td>${item.isAvailable ? 'Yes' : 'No'}</td>
                <td class="action-buttons">
                    <button class="edit-inv-btn" data-id="${item._id}">Edit</button>
                    <button class="delete-inv-btn" data-id="${item._id}" data-name="${item.itemName}">Delete</button>
                </td>
            `;
        });
    }

    if (addInventoryItemForm) {
        addInventoryItemForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const itemData = {
                itemName: document.getElementById('invItemName').value,
                itemType: document.getElementById('invItemType').value,
                unit: document.getElementById('invUnit').value,
                quantityInStock: parseFloat(document.getElementById('invQuantity').value),
                costPerUnit: document.getElementById('invCostPerUnit').value ? parseFloat(document.getElementById('invCostPerUnit').value) : undefined,
                pricePerUnitCharge: document.getElementById('invPricePerUnitCharge').value ? parseFloat(document.getElementById('invPricePerUnitCharge').value) : 0,
                isAvailable: document.getElementById('invIsAvailable').checked,
                supplierInfo: document.getElementById('invSupplierInfo').value,
                notes: document.getElementById('invNotes').value
            };

            try {
                const response = await fetch('/api/inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
                const result = await response.json();
                if (result.success) {
                    showUserMessage(addInventoryMessage, 'Inventory item added successfully!', 'success');
                    addInventoryItemForm.reset();
                    loadInventoryItems();
                } else {
                    showUserMessage(addInventoryMessage, result.message || 'Failed to add inventory item.', 'error');
                }
            } catch (error) {
                console.error('Error adding inventory item:', error);
                showUserMessage(addInventoryMessage, 'An error occurred while adding inventory item.', 'error');
            }
        });
    }

    if (inventoryItemsTableBody) {
    inventoryItemsTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('edit-inv-btn')) {
            currentEditInventoryItemId = event.target.dataset.id;
            try {
                const response = await fetch(`/api/inventory/${currentEditInventoryItemId}`);
                const result = await response.json();
                if (result.success && result.data) {
                    populateEditInventoryItemForm(result.data);
                } else {
                    showUserMessage(listInventoryMessage, 'Could not fetch inventory item details for editing.', 'error');
                }
            } catch (error) {
                console.error('Error fetching inventory item for edit:', error);
                showUserMessage(listInventoryMessage, 'Error fetching inventory item details.', 'error');
            }
        } else if (event.target.classList.contains('delete-inv-btn')) {
            const itemId = event.target.dataset.id;
            const itemName = event.target.dataset.name;
            if (confirm(`Are you sure you want to delete inventory item "${itemName}"?`)) {
                try {
                    const response = await fetch(`/api/inventory/${itemId}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (result.success) {
                        showUserMessage(listInventoryMessage, result.message || `"${itemName}" deleted successfully!`, 'success');
                        loadInventoryItems();
                    } else {
                        showUserMessage(listInventoryMessage, result.message || 'Failed to delete inventory item.', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting inventory item:', error);
                    showUserMessage(listInventoryMessage, 'An error occurred during deletion.', 'error');
                }
            }
        }
    });
} else {
    console.error("Element with ID 'inventoryItemsTableBody' not found. Cannot attach event listener.");
}

    
    
    function populateEditInventoryItemForm(item) {
        document.getElementById('editInventoryItemId').value = item._id;
        document.getElementById('editInvItemName').value = item.itemName;
        document.getElementById('editInvItemType').value = item.itemType;
        document.getElementById('editInvUnit').value = item.unit;
        document.getElementById('editInvQuantity').value = item.quantityInStock;
        document.getElementById('editInvCostPerUnit').value = item.costPerUnit || '';
        document.getElementById('editInvPricePerUnitCharge').value = item.pricePerUnitCharge || 0;
        document.getElementById('editInvIsAvailable').checked = item.isAvailable;
        document.getElementById('editInvSupplierInfo').value = item.supplierInfo || '';
        document.getElementById('editInvNotes').value = item.notes || '';
        
        editInventoryItemFormSection.style.display = 'block';
        addInventoryMessage.textContent = ''; 
        editInventoryMessage.textContent = ''; 
        window.scrollTo(0, editInventoryItemFormSection.offsetTop - 20);
    }

    if (editInventoryItemForm) {
        editInventoryItemForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const itemId = document.getElementById('editInventoryItemId').value;
            const itemData = {
                itemName: document.getElementById('editInvItemName').value,
                itemType: document.getElementById('editInvItemType').value,
                unit: document.getElementById('editInvUnit').value,
                quantityInStock: parseFloat(document.getElementById('editInvQuantity').value),
                costPerUnit: document.getElementById('editInvCostPerUnit').value ? parseFloat(document.getElementById('editInvCostPerUnit').value) : undefined,
                pricePerUnitCharge: document.getElementById('editInvPricePerUnitCharge').value ? parseFloat(document.getElementById('editInvPricePerUnitCharge').value) : 0,
                isAvailable: document.getElementById('editInvIsAvailable').checked,
                supplierInfo: document.getElementById('editInvSupplierInfo').value,
                notes: document.getElementById('editInvNotes').value
            };

            try {
                const response = await fetch(`/api/inventory/${itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
                const result = await response.json();
                if (result.success) {
                    showUserMessage(editInventoryMessage, 'Inventory item updated successfully!', 'success');
                    editInventoryItemFormSection.style.display = 'none';
                    editInventoryItemForm.reset();
                    currentEditInventoryItemId = null;
                    loadInventoryItems();
                } else {
                    showUserMessage(editInventoryMessage, result.message || 'Failed to update inventory item.', 'error');
                }
            } catch (error) {
                console.error('Error updating inventory item:', error);
                showUserMessage(editInventoryMessage, 'An error occurred.', 'error');
            }
        });
    }
    

    if (cancelEditInventoryItemButton) {
        cancelEditInventoryItemButton.addEventListener('click', () => {
            editInventoryItemFormSection.style.display = 'none';
            editInventoryItemForm.reset();
            currentEditInventoryItemId = null;
            editInventoryMessage.textContent = '';
        });
    }

    function getCustomizationConfigFromForm(prefix) {
        const config = {};
        
        const allowQuantity = document.getElementById(`${prefix}CfgAllowQuantity`).checked;
        if (allowQuantity) {
            config.allowQuantitySelection = {
                min: parseInt(document.getElementById(`${prefix}CfgMinQuantity`).value) || 1,
                max: parseInt(document.getElementById(`${prefix}CfgMaxQuantity`).value) || 1,
                pricePerUnit: parseFloat(document.getElementById(`${prefix}CfgPricePerUnit`).value) || 0
            };
        } else {
            config.allowQuantitySelection = false; 
        }

        config.allowSizes = document.getElementById(`${prefix}CfgAllowSizes`).checked;
        
        const allowEspresso = document.getElementById(`${prefix}CfgAllowEspresso`).checked;
        if (allowEspresso) {
            config.allowEspressoShots = {
                max: parseInt(document.getElementById(`${prefix}CfgMaxEspresso`).value) || 0,
                pricePerExtraShot: parseFloat(document.getElementById(`${prefix}CfgEspressoPrice`).value) || 0
            };
        } else {
            config.allowEspressoShots = false;
        }

        // Syrups
        const syrupMode = document.getElementById(`${prefix}CfgSyrupMode`).value;
        if (syrupMode !== 'none') {
            const syrupValuesRaw = document.getElementById(`${prefix}CfgAllowedSyrupTypes`).value.trim();
            config.syrups = {
                mode: syrupMode,
                values: syrupValuesRaw ? syrupValuesRaw.split(',').map(s => s.trim()).filter(s => s) : [],
                label: "Add Syrup:" // Default label, can be made configurable too
            };
        } else {
            config.syrups = { mode: 'none' };
        }
        
        // Toppings
        const toppingMode = document.getElementById(`${prefix}CfgToppingMode`).value;
        if (toppingMode !== 'none') {
            const toppingValuesRaw = document.getElementById(`${prefix}CfgAllowedToppingTypes`).value.trim();
            config.toppings = {
                mode: toppingMode,
                values: toppingValuesRaw ? toppingValuesRaw.split(',').map(s => s.trim()).filter(s => s) : [],
                label: "Add Topping:" // Default label
            };
        } else {
            config.toppings = { mode: 'none' };
        }

        // NEW: Milk Options
        const milkMode = document.getElementById(`${prefix}CfgMilkMode`).value;
        if (milkMode !== 'none') {
            const milkValuesRaw = document.getElementById(`${prefix}CfgAllowedMilk`).value.trim();
            const defaultMilk = document.getElementById(`${prefix}CfgDefaultMilk`).value.trim();
            config.milkOptions = {
                mode: milkMode,
                values: milkValuesRaw ? milkValuesRaw.split(',').map(m => m.trim()).filter(m => m) : [],
                default: defaultMilk || undefined, // Store default if provided
                label: "Milk Choice:" // Default label
            };
        } else {
            config.milkOptions = { mode: 'none' };
        }
        // END NEW: Milk Options

        const allowColdFoam = document.getElementById(`${prefix}CfgAllowColdFoam`).checked;
        if (allowColdFoam) {
            config.allowColdFoam = true;
            config.pricePerColdFoam = parseFloat(document.getElementById(`${prefix}CfgColdFoamPrice`).value) || 0;
        } else {
            config.allowColdFoam = false;
        }
        
        config.isHotDrink = document.getElementById(`${prefix}CfgIsHotDrink`).checked;
        config.allowColdFoamIfHot = document.getElementById(`${prefix}CfgAllowColdFoamIfHot`).checked;


        return config;
    }

    function setCustomizationConfigToForm(prefix, configData = {}) {
        const config = configData && typeof configData === 'object' ? configData : {};
        
        // ... (Quantity, Sizes, Espresso handling remains the same) ...
        const allowQuantityCheckbox = document.getElementById(`${prefix}CfgAllowQuantity`);
        const quantityOptionsDiv = document.getElementById(`${prefix}CfgQuantityOptions`);
        if (config.allowQuantitySelection && typeof config.allowQuantitySelection === 'object') {
            allowQuantityCheckbox.checked = true;
            document.getElementById(`${prefix}CfgMinQuantity`).value = config.allowQuantitySelection.min || 1;
            document.getElementById(`${prefix}CfgMaxQuantity`).value = config.allowQuantitySelection.max || 1;
            document.getElementById(`${prefix}CfgPricePerUnit`).value = config.allowQuantitySelection.pricePerUnit || 0;
        } else {
            allowQuantityCheckbox.checked = false;
            document.getElementById(`${prefix}CfgMinQuantity`).value = 1; 
            document.getElementById(`${prefix}CfgMaxQuantity`).value = 1; 
            document.getElementById(`${prefix}CfgPricePerUnit`).value = ''; 
        }
        if(quantityOptionsDiv) quantityOptionsDiv.style.display = allowQuantityCheckbox.checked ? 'block' : 'none';


        document.getElementById(`${prefix}CfgAllowSizes`).checked = config.allowSizes !== undefined ? config.allowSizes : true;

        const allowEspressoCheckbox = document.getElementById(`${prefix}CfgAllowEspresso`);
        const espressoOptionsDiv = document.getElementById(`${prefix}CfgEspressoOptions`);
        if (config.allowEspressoShots && typeof config.allowEspressoShots === 'object') {
            allowEspressoCheckbox.checked = true;
            document.getElementById(`${prefix}CfgMaxEspresso`).value = config.allowEspressoShots.max || 0;
            document.getElementById(`${prefix}CfgEspressoPrice`).value = config.allowEspressoShots.pricePerExtraShot || 0;
        } else {
            allowEspressoCheckbox.checked = config.allowEspressoShots !== undefined ? config.allowEspressoShots : false;
            document.getElementById(`${prefix}CfgMaxEspresso`).value = 3; 
            document.getElementById(`${prefix}CfgEspressoPrice`).value = 1.00; 
        }
        if(espressoOptionsDiv) espressoOptionsDiv.style.display = allowEspressoCheckbox.checked ? 'block' : 'none';
        
        // Syrups
        const syrupConfig = config.syrups || { mode: 'by_type', values: [] };
        document.getElementById(`${prefix}CfgSyrupMode`).value = syrupConfig.mode || 'by_type';
        document.getElementById(`${prefix}CfgAllowedSyrupTypes`).value = Array.isArray(syrupConfig.values) ? syrupConfig.values.join(',') : '';
        
        // Toppings
        const toppingConfig = config.toppings || { mode: 'by_type', values: [] };
        document.getElementById(`${prefix}CfgToppingMode`).value = toppingConfig.mode || 'by_type';
        document.getElementById(`${prefix}CfgAllowedToppingTypes`).value = Array.isArray(toppingConfig.values) ? toppingConfig.values.join(',') : '';

        // NEW: Milk Options
        const milkConfig = config.milkOptions || { mode: 'by_type', values: [], default: '' };
        document.getElementById(`${prefix}CfgMilkMode`).value = milkConfig.mode || 'by_type';
        document.getElementById(`${prefix}CfgAllowedMilk`).value = Array.isArray(milkConfig.values) ? milkConfig.values.join(',') : '';
        document.getElementById(`${prefix}CfgDefaultMilk`).value = milkConfig.default || '';
        // END NEW: Milk Options

        const allowColdFoamCheckbox = document.getElementById(`${prefix}CfgAllowColdFoam`);
        const coldFoamOptionsDiv = document.getElementById(`${prefix}CfgColdFoamOptions`);
        if (config.allowColdFoam) {
            allowColdFoamCheckbox.checked = true;
            document.getElementById(`${prefix}CfgColdFoamPrice`).value = config.pricePerColdFoam || 0;
        } else {
            allowColdFoamCheckbox.checked = false;
            document.getElementById(`${prefix}CfgColdFoamPrice`).value = 0.75; 
        }
        if(coldFoamOptionsDiv) coldFoamOptionsDiv.style.display = allowColdFoamCheckbox.checked ? 'block' : 'none';


        document.getElementById(`${prefix}CfgIsHotDrink`).checked = config.isHotDrink || false;
        document.getElementById(`${prefix}CfgAllowColdFoamIfHot`).checked = config.allowColdFoamIfHot || false;


        // Manually trigger change events for checkboxes to ensure sub-options visibility is updated
        if (allowQuantityCheckbox) allowQuantityCheckbox.dispatchEvent(new Event('change'));
        if (allowEspressoCheckbox) allowEspressoCheckbox.dispatchEvent(new Event('change'));
        if (allowColdFoamCheckbox) allowColdFoamCheckbox.dispatchEvent(new Event('change'));
    }
    
    if (addMenuItemForm) {
        addMenuItemForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const itemData = {
                name: document.getElementById('addName').value,
                description: document.getElementById('addDescription').value,
                price: parseFloat(document.getElementById('addPrice').value),
                category: document.getElementById('addCategory').value,
                imageUrl: document.getElementById('addImageUrl').value,
                isAvailable: document.getElementById('addIsAvailable').checked,
                customizationConfig: getCustomizationConfigFromForm('add') // Get config
            };
            // ... (rest of the submit logic: fetch, showUserMessage, loadMenuItems) ...
            try {
                const response = await fetch('/api/menu', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
                const result = await response.json();
                if (result.success) {
                    showUserMessage(addMenuMessage, 'Menu item added successfully!', 'success');
                    addMenuItemForm.reset();
                    setCustomizationConfigToForm('add', {}); // Reset config form fields to default
                    loadMenuItems(); 
                } else {
                    showUserMessage(addMenuMessage, result.message || 'Failed to add menu item.', 'error');
                }
            } catch (error) {
                console.error('Error adding menu item:', error);
                showUserMessage(addMenuMessage, 'An error occurred.', 'error');
            }
        });
        // Initialize add form config fields to default state (after attaching event listeners)
        setCustomizationConfigToForm('add', { 
            allowSizes: true, // Example default
            allowEspressoShots: { max:3, pricePerExtraShot: 1.00}, // Example default
            syrups: { mode: 'by_type', values: ['Syrup']}, // Example default
            toppings: { mode: 'by_type', values: ['Topping']}, // Example default
            milkOptions: { mode: 'by_type', values: ['Milk'], default: 'Whole Milk'}, // Example default
            isHotDrink: true // Example default
         });


    }

    function populateEditMenuItemForm(item) {
        document.getElementById('editMenuItemId').value = item._id;
        document.getElementById('editName').value = item.name;
        document.getElementById('editDescription').value = item.description || '';
        document.getElementById('editPrice').value = item.price;
        document.getElementById('editCategory').value = item.category || '';
        document.getElementById('editImageUrl').value = item.imageUrl || '';
        document.getElementById('editIsAvailable').checked = item.isAvailable;
        
        setCustomizationConfigToForm('edit', item.customizationConfig); // Populate config form
        
        editMenuItemFormSection.style.display = 'block';
        addMenuMessage.textContent = ''; 
        editMenuMessage.textContent = ''; 
        window.scrollTo(0, editMenuItemFormSection.offsetTop - 20); 
    }
    
    // When submitting the "Edit Menu Item" form:
    if(editMenuItemForm) {
        editMenuItemForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const itemId = document.getElementById('editMenuItemId').value;
            const itemData = {
                name: document.getElementById('editName').value,
                description: document.getElementById('editDescription').value,
                price: parseFloat(document.getElementById('editPrice').value),
                category: document.getElementById('editCategory').value,
                imageUrl: document.getElementById('editImageUrl').value,
                isAvailable: document.getElementById('editIsAvailable').checked,
                customizationConfig: getCustomizationConfigFromForm('edit') // Get config
            };
            // ... (rest of the submit logic: fetch, showUserMessage, loadMenuItems) ...
             try {
                const response = await fetch(`/api/menu/${itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
                const result = await response.json();
                if (result.success) {
                    showUserMessage(editMenuMessage, 'Menu item updated successfully!', 'success');
                    editMenuItemFormSection.style.display = 'none';
                    editMenuItemForm.reset();
                    currentEditMenuItemId = null;
                    loadMenuItems(); 
                } else {
                    showUserMessage(editMenuMessage, result.message || 'Failed to update menu item.', 'error');
                }
            } catch (error) {
                console.error('Error updating menu item:', error);
                showUserMessage(editMenuMessage, 'An error occurred.', 'error');
            }
        });
    }

    // --- Initial Load ---
    checkAdminAuth();
});