document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menuContainer');
    
    // Modal Elements
    const customizationModal = document.getElementById('customizationModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalItemNameEl = document.getElementById('modalItemName');
    const modalBasePriceEl = document.getElementById('modalBasePrice');
    
    const customizeQuantitySection = document.getElementById('customizeQuantitySection');
    const customizeQuantityInput = document.getElementById('customizeQuantity');

    const customizeSizeSection = document.getElementById('customizeSizeSection');
    const customizeSizeSelect = document.getElementById('customizeSize');
    
    const customizeEspressoShotsSection = document.getElementById('customizeEspressoShotsSection');
    const customizeEspressoShotsInput = document.getElementById('customizeEspressoShots');
    const espressoShotPriceLabelEl = document.getElementById('espressoShotPriceLabel');
    
    const customizeSyrupSection = document.getElementById('customizeSyrupSection');
    const customizeToppingSection = document.getElementById('customizeToppingSection');

    const customizeColdFoamSection = document.getElementById('customizeColdFoamSection');
    const customizeColdFoamCheckbox = document.getElementById('customizeColdFoam');
    const coldFoamPriceLabelEl = document.getElementById('coldFoamPriceLabel');

    const modalTotalPriceEl = document.getElementById('modalTotalPrice');
    const modalAddToCartBtn = document.getElementById('modalAddToCartBtn');

    const customizeSyrupSelect = document.getElementById('customizeSyrup');
    const customizeSyrupLabel = document.getElementById('syrupLabel'); // Added - using the ID from your HTML

    const customizeToppingSelect = document.getElementById('customizeTopping');
    const customizeToppingLabel = document.getElementById('toppingLabel');

    const customizeMilkSection = document.getElementById('customizeMilkSection');
    const customizeMilkSelect = document.getElementById('customizeMilk');
    const milkLabelEl = document.getElementById('milkLabel');

    const cartIconContainer = document.getElementById('cartIconContainer');
    const cartBadge = document.getElementById('cartBadge');
    const cartModal = document.getElementById('cartModal');
    const cartModalCloseBtn = document.getElementById('cartModalCloseBtn');
    const cartItemsList = document.getElementById('cartItemsList');
    const emptyCartMsg = document.getElementById('emptyCartMsg');
    const cartGrandTotalEl = document.getElementById('cartGrandTotal');
    const placeOrderBtn = document.getElementById('placeOrderBtn');


    let currentMenuItem = null; 
    let allCustomizationAddons = []; // Stores all fetched syrups, toppings, etc. from inventory\

    let shoppingCart = []; // To store cart items

    // Default prices for certain add-ons, can be overridden by inventory item price
    const DEFAULT_ESPRESSO_SHOT_PRICE = 1.25;
    const DEFAULT_COLD_FOAM_PRICE = 1.25;

    function loadCartFromStorage() {
        const storedCart = localStorage.getItem('shoppingCart');
        if (storedCart) {
            shoppingCart = JSON.parse(storedCart);
            updateCartDisplay();
        }
    }

    function saveCartToStorage() {
        localStorage.setItem('shoppingCart', JSON.stringify(shoppingCart));
    }

    async function fetchAndDisplayMenu() {
        console.log("fetchAndDisplayMenu called");
        if (!menuContainer) {
            console.error("Error: menuContainer element not found!");
            return;
        }
        menuContainer.innerHTML = '<p class="loading">Fetching menu items...</p>';

        try {
            const response = await fetch('/api/menu');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            const result = await response.json();
            if (result.success && result.data) {
                const menuItemsWithMockConfig = result.data.map(item => {
                    item.customizationConfig.milkOptions = { 
                    label: "Milk Choice:", 
                    mode: 'by_type', 
                    values: ['Milk'],
                    default: 'Whole Milk'
                };
                item.customizationConfig.milkOptions = { mode: 'none' };
                    if (!item.customizationConfig || Object.keys(item.customizationConfig).length === 0) {
                        console.warn(`Item "${item.name}" missing customizationConfig. Applying mock data.`);
                        if (item.name && item.name.toLowerCase().includes('espresso shot')) {
                            item.customizationConfig = {
                                allowQuantitySelection: { min: 1, max: 4, pricePerUnit: item.price },
                                allowSizes: false, allowEspressoShots: false, 
                                syrups: { mode: 'none' }, toppings: { mode: 'none' }, 
                                milkOptions: { mode: 'none' }, 
                                allowColdFoam: false,
                            };
                        } else if (item.category && item.category.toLowerCase().includes('cold') || item.name.toLowerCase().includes('shaken')) {
                             item.customizationConfig = {
                                allowSizes: true, 
                                allowEspressoShots: { max: 3, pricePerExtraShot: DEFAULT_ESPRESSO_SHOT_PRICE },
                                syrups: { label: "Add Syrup:", mode: 'by_type', values: ['Syrup', 'Sauce'] }, 
                                toppings: { label: "Add Topping:", mode: 'by_type', values: ['Topping'] }, 
                                milkOptions: { label: "Milk Choice:", mode: 'by_type', values: ['Milk'], default: 'Whole Milk' },
                                allowColdFoam: true, pricePerColdFoam: DEFAULT_COLD_FOAM_PRICE, 
                                isHotDrink: false
                            };
                        } else { 
                            item.customizationConfig = {
                                allowSizes: true, 
                                allowEspressoShots: { max: 3, pricePerExtraShot: DEFAULT_ESPRESSO_SHOT_PRICE },
                                syrups: { label: "Add Syrup:", mode: 'by_type', values: ['Syrup'] }, 
                                toppings: { label: "Add Topping:", mode: 'by_name', values: ['Whipped Cream'] },
                                milkOptions: { label: "Milk Choice:", mode: 'by_type', values: ['Milk'], default: 'Whole Milk'},
                                allowColdFoam: false, 
                                isHotDrink: true,
                                allowColdFoamIfHot: false
                            };
                        }
                    }
                    if (item.customizationConfig.allowEspressoShots && typeof item.customizationConfig.allowEspressoShots === 'object' && !item.customizationConfig.allowEspressoShots.pricePerExtraShot) {
                        item.customizationConfig.allowEspressoShots.pricePerExtraShot = DEFAULT_ESPRESSO_SHOT_PRICE;
                    }
                    if (item.customizationConfig.allowColdFoam && !item.customizationConfig.pricePerColdFoam) {
                        item.customizationConfig.pricePerColdFoam = DEFAULT_COLD_FOAM_PRICE;
                    }
                    return item;
                });
                displayMenuItems(menuItemsWithMockConfig);
            } else {
                showError(result.message || 'Could not load menu items from API response.');
            }
        } catch (error) {
            console.error('Error in fetchAndDisplayMenu:', error);
            showError('Failed to fetch menu. Please check console for details.');
        }
    }

    function displayMenuItems(items) {
       menuContainer.innerHTML = ''; 
        if (items.length === 0) {
            menuContainer.innerHTML = '<p>No menu items available at the moment.</p>';
            return;
        }
        items.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('menu-item-card');
            let imageHtml = '';
            if (item.imageUrl) {
                imageHtml = `<img src="${item.imageUrl}" alt="${item.name}">`;
            }
            const availabilityHtml = item.isAvailable
                ? `<span class="price">$${parseFloat(item.price).toFixed(2)}</span>`
                : `<span class="not-available">Currently unavailable</span>`;
            let customizeButtonHtml = '';
            if (item.isAvailable) {
                 customizeButtonHtml = `<button class="customize-btn" data-item-id="${item._id}">Details & Add</button>`;
            }
            card.innerHTML = `
                ${imageHtml}
                <h3>${item.name}</h3>
                ${item.category ? `<p class="category">Category: ${item.category}</p>` : ''}
                <p class="description">${item.description || 'No description available.'}</p>
                <div class="price-section">${availabilityHtml}</div>
                ${customizeButtonHtml}
            `;
            menuContainer.appendChild(card);
            if (item.isAvailable) {
                const customizeBtn = card.querySelector('.customize-btn');
                if (customizeBtn) {
                    customizeBtn.addEventListener('click', () => {
                        const fullItemData = items.find(i => i._id === customizeBtn.dataset.itemId);
                        console.log("Button clicked for:", fullItemData.name, "ID:", fullItemData._id, "Passing this config to modal:", JSON.stringify(fullItemData ? fullItemData.customizationConfig : "N/A", null, 2));
                        openCustomizationModal(fullItemData);
                    });
                }
            }
        });
    }

    async function fetchAllCustomizationAddons() {
        if (allCustomizationAddons.length > 0 && allCustomizationAddons[0].mock !== "data") return; 
        try {
            const response = await fetch('/api/inventory/customizations');
            if (!response.ok) {
                 const errorData = await response.text(); // Try to get error text
                 console.error(`Failed to fetch customization add-ons. Status: ${response.status}, Body: ${errorData}`);
                 throw new Error('Failed to fetch customization add-ons');
            }
            const result = await response.json();
            if (result.success) {
                allCustomizationAddons = result.data;
                 console.log("Fetched addons for customization (allCustomizationAddons):", JSON.stringify(allCustomizationAddons, null, 2));
            } else {
                console.error('Could not load customization add-ons:', result.message);
                allCustomizationAddons = []; // Ensure it's an empty array on failure
            }
        } catch (error) {
            console.error('Error fetching customization add-ons:', error);
            allCustomizationAddons = []; // Ensure it's an empty array on critical failure
        }
    }

    function populateSelectWithOptions(selectElement, sectionLabelElement, configRule) {
        if(!selectElement) {
            console.error("populateSelectWithOptions: selectElement is null for rule", configRule);
            return false;
        }
        console.log(`Populating options for select element (ID: ${selectElement.id}), Label: ${sectionLabelElement ? sectionLabelElement.id : 'N/A'}, Config Rule:`, JSON.stringify(configRule, null, 2));
        selectElement.innerHTML = `<option value="" data-price="0">None</option>`;        
        if (!configRule || configRule.mode === 'none' || !configRule.values || configRule.values.length === 0) {
            console.log("No options to populate: Config rule empty, mode is 'none', or no values.");
            return false; 
        }
        if (sectionLabelElement && configRule.label) {
            sectionLabelElement.textContent = configRule.label;
        }
        let relevantAddons = [];
        if (configRule.mode === 'by_type') {
            relevantAddons = allCustomizationAddons.filter(addon => 
                configRule.values.includes(addon.itemType) && addon.pricePerUnitCharge >= 0 // Allow $0 options
            );
        } else if (configRule.mode === 'by_id') {
            relevantAddons = allCustomizationAddons.filter(addon => 
                configRule.values.includes(addon._id) && addon.pricePerUnitCharge >= 0 // Allow $0 options
            );
        } else if (configRule.mode === 'by_name') {
            relevantAddons = allCustomizationAddons.filter(addon => 
                configRule.values.includes(addon.itemName) && addon.pricePerUnitCharge >= 0 // Allow $0 options
            );
        }
        console.log(`Relevant addons for ${selectElement.id} after filtering:`, JSON.stringify(relevantAddons, null, 2));
        if (relevantAddons.length > 0) {
            relevantAddons.sort((a, b) => a.itemName.localeCompare(b.itemName));
            relevantAddons.forEach(addon => {
                const option = document.createElement('option');
                option.value = addon._id; 
                option.textContent = `${addon.itemName} (+$${parseFloat(addon.pricePerUnitCharge).toFixed(2)})`;
                option.dataset.price = addon.pricePerUnitCharge;
                option.dataset.itemName = addon.itemName;
                selectElement.appendChild(option);
            });
            return true;
        }
        return false;
    }

    async function openCustomizationModal(item) {
        if (!item || !item.customizationConfig) {
            console.warn("Item or item.customizationConfig is missing. Treating as simple add.", item);
             if(item) { 
                addItemToCart({ // Directly add to cart if not configurable
                    itemId: item._id, name: item.name, basePriceSnapshot: parseFloat(item.price),
                    quantity: 1, customizations: {}, finalPrice: parseFloat(item.price)
                });
                alert(`${item.name} added to order!`);
             }
            return;
        }
        currentMenuItem = item;
        await fetchAllCustomizationAddons(); 
        console.log("Opening modal for item:", item.name, "with config:", JSON.stringify(item.customizationConfig, null, 2));
        console.log("Available customization addons:", JSON.stringify(allCustomizationAddons, null, 2));


        modalItemNameEl.textContent = item.name;
        modalBasePriceEl.textContent = parseFloat(item.price).toFixed(2);
        
        [customizeQuantitySection, customizeSizeSection, customizeEspressoShotsSection, customizeSyrupSection, customizeToppingSection, customizeMilkSection, customizeColdFoamSection]
            .forEach(section => { if(section) section.style.display = 'none'; }); 
        
        customizeQuantityInput.value = 1;
        customizeSizeSelect.value = 'small';
        customizeEspressoShotsInput.value = 0;
        if(customizeSyrupSelect) customizeSyrupSelect.value = "";
        if(customizeToppingSelect) customizeToppingSelect.value = "";
        if(customizeMilkSelect) customizeMilkSelect.value = ""; 
        if(customizeColdFoamCheckbox) customizeColdFoamCheckbox.checked = false;

        const config = item.customizationConfig;

        if (config.allowQuantitySelection && typeof config.allowQuantitySelection === 'object') {
            customizeQuantityInput.min = config.allowQuantitySelection.min || 1;
            customizeQuantityInput.max = config.allowQuantitySelection.max || 10;
            customizeQuantityInput.value = config.allowQuantitySelection.min || 1;
            modalBasePriceEl.textContent = parseFloat(config.allowQuantitySelection.pricePerUnit || item.price).toFixed(2);
            if(customizeQuantitySection) customizeQuantitySection.style.display = 'block';
        } else {
            customizeQuantityInput.value = 1;
        }

        if (config.allowSizes) {
            if(customizeSizeSection) customizeSizeSection.style.display = 'block';
        }

        if (config.allowEspressoShots && typeof config.allowEspressoShots === 'object') {
            customizeEspressoShotsInput.max = config.allowEspressoShots.max !== undefined ? config.allowEspressoShots.max : 5;
            if(espressoShotPriceLabelEl) espressoShotPriceLabelEl.textContent = parseFloat(config.allowEspressoShots.pricePerExtraShot || DEFAULT_ESPRESSO_SHOT_PRICE).toFixed(2);
            if(customizeEspressoShotsSection) customizeEspressoShotsSection.style.display = 'block';
        }

        if (config.syrups && config.syrups.mode !== 'none' && customizeSyrupSelect && customizeSyrupLabel) {
            if (populateSelectWithOptions(customizeSyrupSelect, customizeSyrupLabel, config.syrups)) {
                if(customizeSyrupSection) customizeSyrupSection.style.display = 'block';
            }
        }
        
        if (config.toppings && config.toppings.mode !== 'none' && customizeToppingSelect && customizeToppingLabel) {
             if (populateSelectWithOptions(customizeToppingSelect, customizeToppingLabel, config.toppings)) {
                if(customizeToppingSection) customizeToppingSection.style.display = 'block';
            }
        }

        if (config.milkOptions && config.milkOptions.mode !== 'none' && customizeMilkSelect && milkLabelEl) {
            if (populateSelectWithOptions(customizeMilkSelect, milkLabelEl, config.milkOptions)) {
                if(customizeMilkSection) customizeMilkSection.style.display = 'block';
                // Set default milk if specified
                if (config.milkOptions.default) {
                    let defaultFound = false;
                    for (let option of customizeMilkSelect.options) {
                        if (option.value === config.milkOptions.default || option.dataset.itemName === config.milkOptions.default) {
                            customizeMilkSelect.value = option.value;
                            defaultFound = true;
                            break;
                        }
                    }
                    if (!defaultFound) console.warn(`Default milk "${config.milkOptions.default}" not found or not available for item "${item.name}".`);
                } else {
                     // If no default, and "None" is the first option, it will be selected.
                     // If "None" isn't desired as a default selectable when options are present,
                     // you might want to select the first actual milk option.
                     if (customizeMilkSelect.options.length > 1 && customizeMilkSelect.options[0].value === "") {
                         // If "None" is present and no default, do nothing to keep "None" selected.
                         // If you want to force a selection if options exist:
                         // customizeMilkSelect.value = customizeMilkSelect.options[1].value;
                     }
                }
            } else {
                 if(customizeMilkSection) customizeMilkSection.style.display = 'none';
            }
        } else {
            if(customizeMilkSection) customizeMilkSection.style.display = 'none';
        }
        
        if (config.allowColdFoam && customizeColdFoamCheckbox) {
            let showColdFoam = true;
            if (config.isHotDrink === true && config.allowColdFoamIfHot !== true) {
                showColdFoam = false;
            }
            if (showColdFoam) {
                if(coldFoamPriceLabelEl) coldFoamPriceLabelEl.textContent = parseFloat(config.pricePerColdFoam || DEFAULT_COLD_FOAM_PRICE).toFixed(2);
                if(customizeColdFoamSection) customizeColdFoamSection.style.display = 'block';
            }
        }
        
        updateTotalPrice();
        if(customizationModal) customizationModal.style.display = 'block';
    }

    async function fetchCustomizationOptions() {
        try {
            const response = await fetch('/api/inventory/customizations');
            if (!response.ok) throw new Error('Failed to fetch customization options');
            const result = await response.json();
            if (result.success) {
                customizationOptions = result.data;
                populateSyrupOptions(customizationOptions.filter(opt => opt.itemType === 'Syrup'));
            } else {
                console.error('Could not load customization options:', result.message);
                syrupSelectionGroup.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching customization options:', error);
            syrupSelectionGroup.style.display = 'none';
        }
    }

    function populateSyrupOptions(syrups) {
        customizeSyrupSelect.innerHTML = '<option value="" data-price="0">No Syrup</option>'; // Reset
        if (syrups && syrups.length > 0) {
            syrups.forEach(syrup => {
                const option = document.createElement('option');
                option.value = syrup._id;
                option.textContent = `${syrup.itemName} (+$${parseFloat(syrup.pricePerUnitCharge).toFixed(2)})`;
                option.dataset.price = syrup.pricePerUnitCharge;
                customizeSyrupSelect.appendChild(option);
            });
            syrupSelectionGroup.style.display = 'block';
        } else {
            syrupSelectionGroup.style.display = 'none';
        }
    }

    function closeCustomizationModal() {
        customizationModal.style.display = 'none';
        currentMenuItem = null;
    }

    function updateTotalPrice() {
        if (!currentMenuItem) return;

        let baseItemPrice = parseFloat(currentMenuItem.price);
        const config = currentMenuItem.customizationConfig;
        let quantity = 1;

        if (config.allowQuantitySelection && typeof config.allowQuantitySelection === 'object' && customizeQuantitySection.style.display !== 'none') {
            quantity = parseInt(customizeQuantityInput.value) || 1;
            baseItemPrice = parseFloat(config.allowQuantitySelection.pricePerUnit || currentMenuItem.price);
        }
        
        let total = baseItemPrice * quantity;

        if (config.allowSizes && customizeSizeSection.style.display !== 'none' && !(config.allowQuantitySelection && typeof config.allowQuantitySelection === 'object')) {
            const selectedSizeOption = customizeSizeSelect.options[customizeSizeSelect.selectedIndex];
            total += parseFloat(selectedSizeOption.dataset.priceModifier || 0);
        }

        if (config.allowEspressoShots && typeof config.allowEspressoShots === 'object' && customizeEspressoShotsSection.style.display !== 'none') {
            const numEspressoShots = parseInt(customizeEspressoShotsInput.value) || 0;
            const shotPrice = parseFloat(config.allowEspressoShots.pricePerExtraShot || DEFAULT_ESPRESSO_SHOT_PRICE);
            total += numEspressoShots * shotPrice;
        }

        if (config.syrups && customizeSyrupSection.style.display !== 'none') {
            const selectedSyrupOption = customizeSyrupSelect.options[customizeSyrupSelect.selectedIndex];
            if (selectedSyrupOption && selectedSyrupOption.value) {
                total += parseFloat(selectedSyrupOption.dataset.price || 0);
            }
        }
        
        if (config.toppings && customizeToppingSection.style.display !== 'none') {
            const selectedToppingOption = customizeToppingSelect.options[customizeToppingSelect.selectedIndex];
            if (selectedToppingOption && selectedToppingOption.value) {
                total += parseFloat(selectedToppingOption.dataset.price || 0);
            }
        }

        if (config.milkOptions && customizeMilkSection && customizeMilkSection.style.display !== 'none' && customizeMilkSelect) {
            const selectedMilkOption = customizeMilkSelect.options[customizeMilkSelect.selectedIndex];
            if (selectedMilkOption && selectedMilkOption.value) { 
                total += parseFloat(selectedMilkOption.dataset.price || 0);
            }
        }

        if (config.allowColdFoam && customizeColdFoamSection.style.display !== 'none' && customizeColdFoamCheckbox.checked) {
            total += parseFloat(config.pricePerColdFoam || DEFAULT_COLD_FOAM_PRICE);
        }
        
        modalTotalPriceEl.textContent = total.toFixed(2);
    }

    function addItemToCart(orderItem) {
        // Check if item with exact same base ID and customizations already exists
        // For simplicity now, we generate a unique cartItemId for each add.
        // A more complex check would involve deep-comparing customizations.
        const cartItemId = Date.now().toString() + "_" + orderItem.itemId; // Simple unique ID

        const cartEntry = {
            ...orderItem,
            cartItemId: cartItemId // Unique ID for this specific entry in the cart
        };
        shoppingCart.push(cartEntry);
        console.log("Cart updated:", shoppingCart);
        saveCartToStorage();
        updateCartDisplay();
    }

    function updateCartDisplay() {
        renderCartItems();
        calculateAndDisplayCartTotal();
        updateCartIconBadge();
    }

    function updateCartIconBadge() {
        const totalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartBadge) {
            if (totalItems > 0) {
                cartBadge.textContent = totalItems;
                cartBadge.style.display = 'block';
            } else {
                cartBadge.style.display = 'none';
            }
        }
    }

    function renderCartItems() {
        if (!cartItemsList) return;
        cartItemsList.innerHTML = ''; // Clear existing items

        if (shoppingCart.length === 0) {
            if(emptyCartMsg) emptyCartMsg.style.display = 'block';
            if(placeOrderBtn) placeOrderBtn.disabled = true;
            return;
        }
        if(emptyCartMsg) emptyCartMsg.style.display = 'none';
        if(placeOrderBtn) placeOrderBtn.disabled = false;

        shoppingCart.forEach(item => {
            const li = document.createElement('li');
            li.dataset.cartItemId = item.cartItemId;

            let customizationsHtml = '';
            if (item.customizations) {
                customizationsHtml += '<ul>';
                if(item.customizations.size && item.customizations.size.name !== 'Small') customizationsHtml += `<li>Size: ${item.customizations.size.name}</li>`;
                if(item.customizations.extraEspressoShots && item.customizations.extraEspressoShots.quantity > 0) customizationsHtml += `<li>Extra Shots: ${item.customizations.extraEspressoShots.quantity}</li>`;
                if(item.customizations.syrup) customizationsHtml += `<li>Syrup: ${item.customizations.syrup.name}</li>`;
                if(item.customizations.topping) customizationsHtml += `<li>Topping: ${item.customizations.topping.name}</li>`;
                if(item.customizations.milk) customizationsHtml += `<li>Milk: ${item.customizations.milk.name}</li>`;
                if(item.customizations.coldFoam && item.customizations.coldFoam.added) customizationsHtml += `<li>Cold Foam</li>`;
                customizationsHtml += '</ul>';
            }
            
            const itemTotal = item.finalPrice; // This is already item.quantity * priceOfOneConfiguredItem

            li.innerHTML = `
                <div class="item-details">
                    <span class="item-name">${item.name} (x${item.quantity})</span>
                    <div class="item-customizations">${customizationsHtml || 'No customizations'}</div>
                </div>
                <div class="item-quantity">
                    <button class="cart-qty-change" data-change="-1">-</button>
                    <input type="number" value="${item.quantity}" min="1" class="cart-item-qty-input" readonly>
                    <button class="cart-qty-change" data-change="1">+</button>
                </div>
                <div class="item-price">
                    $${itemTotal.toFixed(2)}
                </div>
                <div class="item-actions">
                    <button class="cart-remove-item">Remove</button>
                </div>
            `;
            cartItemsList.appendChild(li);
        });
    }
    
    function handleCartActions(event) {
        const target = event.target;
        const cartItemLi = target.closest('li');
        if (!cartItemLi) return;
        const cartItemId = cartItemLi.dataset.cartItemId;

        if (target.classList.contains('cart-qty-change')) {
            const change = parseInt(target.dataset.change);
            updateCartItemQuantity(cartItemId, change);
        } else if (target.classList.contains('cart-remove-item')) {
            removeCartItem(cartItemId);
        }
    }
    if(cartItemsList) cartItemsList.addEventListener('click', handleCartActions);


    function updateCartItemQuantity(cartItemId, change) {
        const itemIndex = shoppingCart.findIndex(item => item.cartItemId === cartItemId);
        if (itemIndex > -1) {
            const item = shoppingCart[itemIndex];
            const pricePerSingleConfiguredItem = item.finalPrice / item.quantity; // Calculate price of one configured unit
            
            item.quantity += change;
            if (item.quantity <= 0) {
                shoppingCart.splice(itemIndex, 1); // Remove if quantity is 0 or less
            } else {
                 // Recalculate finalPrice for the new quantity of this line item
                item.finalPrice = pricePerSingleConfiguredItem * item.quantity;
            }
            saveCartToStorage();
            updateCartDisplay();
        }
    }

    function removeCartItem(cartItemId) {
        shoppingCart = shoppingCart.filter(item => item.cartItemId !== cartItemId);
        saveCartToStorage();
        updateCartDisplay();
    }

    function calculateAndDisplayCartTotal() {
        const grandTotal = shoppingCart.reduce((sum, item) => sum + item.finalPrice, 0);
        if(cartGrandTotalEl) cartGrandTotalEl.textContent = grandTotal.toFixed(2);
    }

    function openCartModal() {
        renderCartItems(); // Re-render each time it's opened
        calculateAndDisplayCartTotal();
        if(cartModal) cartModal.style.display = 'block';
    }

    function closeCartModal() {
        if(cartModal) cartModal.style.display = 'none';
    }

    // Event Listeners for Cart Modal
    if (cartIconContainer) cartIconContainer.addEventListener('click', openCartModal);
    if (cartModalCloseBtn) cartModalCloseBtn.addEventListener('click', closeCartModal);
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', () => {
            if (shoppingCart.length === 0) {
                alert("Your cart is empty. Add some items first!");
                return;
            }
            // For now, just log and clear
            console.log("Placing order with items:", JSON.stringify(shoppingCart, null, 2));
            alert("Order Placed (conceptually)! Thank you!");
            
            shoppingCart = []; // Clear the cart
            saveCartToStorage();
            updateCartDisplay();
            closeCartModal();
        });
    }

    // Event Listeners for Modal
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeCustomizationModal);
    window.addEventListener('click', (event) => { 
        if (event.target == customizationModal) {
            closeCustomizationModal();
        }
    });

    customizeQuantityInput.addEventListener('input', updateTotalPrice);
    customizeSizeSelect.addEventListener('change', updateTotalPrice);
    customizeEspressoShotsInput.addEventListener('input', updateTotalPrice);
    customizeSyrupSelect.addEventListener('change', updateTotalPrice);
    customizeToppingSelect.addEventListener('change', updateTotalPrice);
    customizeColdFoamCheckbox.addEventListener('change', updateTotalPrice);

    if (modalAddToCartBtn) {
        modalAddToCartBtn.addEventListener('click', () => {
            if (!currentMenuItem) return;
            const config = currentMenuItem.customizationConfig;
            
            // This logic to build orderItem should be robust from previous steps
            const orderItem = { /* ... (construct orderItem as before) ... */ };
             orderItem.itemId = currentMenuItem._id;
             orderItem.name = currentMenuItem.name;
             orderItem.basePriceSnapshot = parseFloat(currentMenuItem.price);
             orderItem.quantity = (config.allowQuantitySelection && typeof config.allowQuantitySelection === 'object' && customizeQuantitySection && customizeQuantitySection.style.display !== 'none' ? parseInt(customizeQuantityInput.value) : 1);
             orderItem.customizations = {};
             orderItem.finalPrice = parseFloat(modalTotalPriceEl.textContent); // This should be the price for the configured quantity

            // Adjust finalPrice to be per single configured item if quantity > 1
            const singleItemConfiguredPrice = orderItem.finalPrice / orderItem.quantity;

            if (config.allowSizes && customizeSizeSection && customizeSizeSection.style.display !== 'none' && !(config.allowQuantitySelection && typeof config.allowQuantitySelection === 'object')) {
                const selectedSizeOption = customizeSizeSelect.options[customizeSizeSelect.selectedIndex];
                orderItem.customizations.size = {
                    name: selectedSizeOption.textContent.split(' (')[0],
                    modifier: parseFloat(selectedSizeOption.dataset.priceModifier || 0)
                };
            }
            if (config.allowEspressoShots && typeof config.allowEspressoShots === 'object' && customizeEspressoShotsSection && customizeEspressoShotsSection.style.display !== 'none') {
                const numShots = parseInt(customizeEspressoShotsInput.value) || 0;
                if (numShots > 0) {
                    orderItem.customizations.extraEspressoShots = {
                        quantity: numShots,
                        pricePerShot: parseFloat(config.allowEspressoShots.pricePerExtraShot || DEFAULT_ESPRESSO_SHOT_PRICE)
                    };
                }
            }
            if (config.syrups && customizeSyrupSection && customizeSyrupSection.style.display !== 'none' && customizeSyrupSelect) {
                const selectedSyrupOption = customizeSyrupSelect.options[customizeSyrupSelect.selectedIndex];
                if (selectedSyrupOption && selectedSyrupOption.value) {
                    orderItem.customizations.syrup = {
                        inventoryId: selectedSyrupOption.value,
                        name: selectedSyrupOption.dataset.itemName, 
                        price: parseFloat(selectedSyrupOption.dataset.price || 0)
                    };
                }
            }
            if (config.toppings && customizeToppingSection && customizeToppingSection.style.display !== 'none' && customizeToppingSelect) {
                const selectedToppingOption = customizeToppingSelect.options[customizeToppingSelect.selectedIndex];
                if (selectedToppingOption && selectedToppingOption.value) {
                     orderItem.customizations.topping = {
                        inventoryId: selectedToppingOption.value,
                        name: selectedToppingOption.dataset.itemName, 
                        price: parseFloat(selectedToppingOption.dataset.price || 0)
                    };
                }
            }
            if (config.milkOptions && customizeMilkSection && customizeMilkSection.style.display !== 'none' && customizeMilkSelect) {
                const selectedMilkOption = customizeMilkSelect.options[customizeMilkSelect.selectedIndex];
                if (selectedMilkOption && selectedMilkOption.value) {
                    orderItem.customizations.milk = {
                        inventoryId: selectedMilkOption.value,
                        name: selectedMilkOption.dataset.itemName, 
                        price: parseFloat(selectedMilkOption.dataset.price || 0)
                    };
                }
            }
            if (config.allowColdFoam && customizeColdFoamSection && customizeColdFoamSection.style.display !== 'none' && customizeColdFoamCheckbox && customizeColdFoamCheckbox.checked) {
                orderItem.customizations.coldFoam = {
                    added: true,
                    price: parseFloat(config.pricePerColdFoam || DEFAULT_COLD_FOAM_PRICE)
                };
            }
            
            // The finalPrice in orderItem is for the total quantity from the modal.
            // For cart logic, we might want price of a single configured item, and then cart handles quantity.
            // Let's adjust: orderItem.finalPrice will be price for ONE configured item.
            // The quantity selected in the modal is how many of THIS configured item to add.
            orderItem.pricePerConfiguredItem = singleItemConfiguredPrice;
            // The 'quantity' field already holds how many of this specific configuration are being added.
            // The 'finalPrice' will be calculated in the cart as quantity * pricePerConfiguredItem.
            // For now, let's keep the current orderItem.finalPrice as the total for the line item added.

            addItemToCart(orderItem); // NEW: Add to cart object
            alert(`${orderItem.name} (x${orderItem.quantity}) added to your order!`);
            closeCustomizationModal();
        });
    }

    if(customizeQuantityInput) customizeQuantityInput.addEventListener('input', updateTotalPrice);
    if(customizeSizeSelect) customizeSizeSelect.addEventListener('change', updateTotalPrice);
    if(customizeEspressoShotsInput) customizeEspressoShotsInput.addEventListener('input', updateTotalPrice);
    if(customizeSyrupSelect) customizeSyrupSelect.addEventListener('change', updateTotalPrice);
    if(customizeToppingSelect) customizeToppingSelect.addEventListener('change', updateTotalPrice);
    if(customizeMilkSelect) customizeMilkSelect.addEventListener('change', updateTotalPrice);
    if(customizeColdFoamCheckbox) customizeColdFoamCheckbox.addEventListener('change', updateTotalPrice);
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', closeCustomizationModal);
    window.addEventListener('click', (event) => { 
        if (event.target === customizationModal) closeCustomizationModal();
        if (event.target === cartModal) closeCartModal(); // Close cart modal if backdrop is clicked
    });


    function showError(message) {
        console.log("showError called with message:", message); 
        if (menuContainer) {
            menuContainer.innerHTML = `<p class="error-message">${message}</p>`;
        } else {
            console.error("Cannot show error, menuContainer not found. Error was:", message);
        }
    }

    fetchAndDisplayMenu(); // Initial call
});