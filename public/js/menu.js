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

    let currentMenuItem = null; 
    let allCustomizationAddons = []; // Stores all fetched syrups, toppings, etc. from inventory

    // Default prices for certain add-ons, can be overridden by inventory item price
    const DEFAULT_ESPRESSO_SHOT_PRICE = 1.25;
    const DEFAULT_COLD_FOAM_PRICE = 1.25;

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
                    if (!item.customizationConfig || Object.keys(item.customizationConfig).length === 0) {
                        console.warn(`Item "${item.name}" missing customizationConfig. Applying mock data.`);
                        if (item.name && item.name.toLowerCase().includes('espresso shot')) {
                            item.customizationConfig = {
                                allowQuantitySelection: { min: 1, max: 4, pricePerUnit: item.price },
                                allowSizes: false, allowEspressoShots: false, 
                                syrups: { mode: 'none' }, toppings: { mode: 'none' }, 
                                milkOptions: { mode: 'none' }, // No milk for plain espresso
                                allowColdFoam: false,
                            };
                        } else if (item.category && item.category.toLowerCase().includes('cold') || item.name.toLowerCase().includes('shaken')) {
                             item.customizationConfig = {
                                allowSizes: true, 
                                allowEspressoShots: { max: 3, pricePerExtraShot: DEFAULT_ESPRESSO_SHOT_PRICE },
                                syrups: { label: "Add Syrup:", mode: 'by_type', values: ['Syrup', 'Sauce'] }, 
                                toppings: { label: "Add Topping:", mode: 'by_type', values: ['Topping'] }, 
                                milkOptions: { label: "Milk Choice:", mode: 'by_type', values: ['Milk'], default: 'Whole Milk' }, // Assuming 'Whole Milk' is an itemName
                                allowColdFoam: true, pricePerColdFoam: DEFAULT_COLD_FOAM_PRICE, 
                                isHotDrink: false
                            };
                        } else { 
                            item.customizationConfig = {
                                allowSizes: true, 
                                allowEspressoShots: { max: 3, pricePerExtraShot: DEFAULT_ESPRESSO_SHOT_PRICE },
                                syrups: { label: "Add Syrup:", mode: 'by_type', values: ['Syrup'] }, 
                                toppings: { label: "Add Topping:", mode: 'by_name', values: ['Whipped Cream'] },
                                milkOptions: { label: "Milk Choice:", mode: 'by_type', values: ['Milk'], default: 'Whole Milk'}, // Assuming 'Whole Milk' is an itemName
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
            if (item.isAvailable) { // All available items can be "added" even if not further customizable
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
                        // Find the original item data, including its customizationConfig
                        const fullItemData = items.find(i => i._id === customizeBtn.dataset.itemId);
                        openCustomizationModal(fullItemData);
                    });
                }
            }
        });
    }

    async function fetchAllCustomizationAddons() {
        if (allCustomizationAddons.length > 0) return; // Fetch only once
        try {
            const response = await fetch('/api/inventory/customizations');
            if (!response.ok) throw new Error('Failed to fetch customization add-ons');
            const result = await response.json();
            if (result.success) {
                allCustomizationAddons = result.data;
                console.log("Fetched addons for customization (allCustomizationAddons):", JSON.stringify(allCustomizationAddons, null, 2));
            } else {
                console.error('Could not load customization add-ons:', result.message);
            }
        } catch (error) {
            console.error('Error fetching customization add-ons:', error);
        }
    }

    function populateSelectWithOptions(selectElement, sectionLabelElement, configRule) {
        console.log("Populating select for rule:", JSON.stringify(configRule));
        selectElement.innerHTML = `<option value="" data-price="0">None</option>`; // Default "None" option
        
        if (!configRule || configRule.mode === 'none' || !configRule.values || configRule.values.length === 0) {
            console.log("Config rule empty or mode is none.");
            return false; // No options to populate based on config
        }

        if (sectionLabelElement && configRule.label) {
            sectionLabelElement.textContent = configRule.label;
        }

        let relevantAddons = [];
        if (configRule.mode === 'by_type') {
            relevantAddons = allCustomizationAddons.filter(addon => 
                configRule.values.includes(addon.itemType) && addon.pricePerUnitCharge >= 0
            );
        } else if (configRule.mode === 'by_id') {
            relevantAddons = allCustomizationAddons.filter(addon => 
                configRule.values.includes(addon._id) && addon.pricePerUnitCharge >= 0
            );
        } else if (configRule.mode === 'by_name') {
            relevantAddons = allCustomizationAddons.filter(addon => 
                configRule.values.includes(addon.itemName) && addon.pricePerUnitCharge >= 0
            );
        }

        if (relevantAddons.length > 0) {
            relevantAddons.sort((a, b) => a.itemName.localeCompare(b.itemName)); // Sort alphabetically
            relevantAddons.forEach(addon => {
                const option = document.createElement('option');
                option.value = addon._id; 
                option.textContent = `${addon.itemName} (+$${parseFloat(addon.pricePerUnitCharge).toFixed(2)})`;
                option.dataset.price = addon.pricePerUnitCharge;
                option.dataset.itemName = addon.itemName; // Store itemName for order summary
                selectElement.appendChild(option);
            });
            return true; // Options were populated
        }
        return false; // No options populated
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

    async function openCustomizationModal(item) {
        console.log("Current item customizationConfig:", JSON.stringify(item.customizationConfig, null, 2));
        if (!item || !item.customizationConfig) {
        console.warn("Item or item.customizationConfig is missing. Treating as simple add.", item);
        if(item) { 
            console.log("Simple Item Added (concept):", {itemId: item._id, name: item.name, price: item.price, quantity: 1});
            alert(`${item.name} (conceptually) added to order! Price: $${parseFloat(item.price).toFixed(2)}`);
        }
        return; // << If this line is reached, the modal won't show.
    }
        currentMenuItem = item;
        await fetchAllCustomizationAddons(); 

        modalItemNameEl.textContent = item.name;
        modalBasePriceEl.textContent = parseFloat(item.price).toFixed(2);
        
        [customizeQuantitySection, customizeSizeSection, customizeEspressoShotsSection, customizeSyrupSection, customizeToppingSection, customizeColdFoamSection]
            .forEach(section => section.style.display = 'none');
        
        // Reset fields before applying config
        customizeQuantityInput.value = 1;
        customizeSizeSelect.value = 'small';
        customizeEspressoShotsInput.value = 0;
        customizeSyrupSelect.value = "";
        customizeToppingSelect.value = "";
        customizeColdFoamCheckbox.checked = false;

        const config = item.customizationConfig;

        if (config.allowQuantitySelection && typeof config.allowQuantitySelection === 'object') {
            customizeQuantityInput.min = config.allowQuantitySelection.min || 1;
            customizeQuantityInput.max = config.allowQuantitySelection.max || 10;
            customizeQuantityInput.value = config.allowQuantitySelection.min || 1;
            modalBasePriceEl.textContent = parseFloat(config.allowQuantitySelection.pricePerUnit || item.price).toFixed(2);
            customizeQuantitySection.style.display = 'block';
        } else {
            customizeQuantityInput.value = 1;
        }

        if (config.allowSizes) {
            customizeSizeSection.style.display = 'block';
        }

        if (config.allowEspressoShots && typeof config.allowEspressoShots === 'object') {
            customizeEspressoShotsInput.max = config.allowEspressoShots.max !== undefined ? config.allowEspressoShots.max : 5;
            espressoShotPriceLabelEl.textContent = parseFloat(config.allowEspressoShots.pricePerExtraShot || DEFAULT_ESPRESSO_SHOT_PRICE).toFixed(2);
            customizeEspressoShotsSection.style.display = 'block';
        }

        if (config.syrups && config.syrups.mode !== 'none') {
            if (populateSelectWithOptions(customizeSyrupSelect, customizeSyrupLabel, config.syrups)) {
                customizeSyrupSection.style.display = 'block';
            }
        }
        
        if (config.toppings && config.toppings.mode !== 'none') {
             if (populateSelectWithOptions(customizeToppingSelect, customizeToppingLabel, config.toppings)) {
                customizeToppingSection.style.display = 'block';
            }
        }

        if (config.milkOptions && config.milkOptions.mode !== 'none') {
            if (populateSelectWithOptions(customizeMilkSelect, milkLabelEl, config.milkOptions)) {
                if(customizeMilkSection) customizeMilkSection.style.display = 'block';
                // Set default milk if specified
                if (config.milkOptions.default) {
                    let defaultFound = false;
                    for (let option of customizeMilkSelect.options) {
                        // Default can be by ID or by Name. Check both.
                        if (option.value === config.milkOptions.default || option.dataset.itemName === config.milkOptions.default) {
                            customizeMilkSelect.value = option.value;
                            defaultFound = true;
                            break;
                        }
                    }
                    if (!defaultFound) console.warn(`Default milk "${config.milkOptions.default}" not found in populated options.`);
                }
            }
        }
        
        if (config.allowColdFoam) { // Rule for hot drink is now handled by config.isHotDrink
            if (config.isHotDrink === true && config.allowColdFoamIfHot !== true) { // Explicitly allow cold foam on hot if desired
                 // Don't show if it's a hot drink and not explicitly allowed for hot
            } else {
                coldFoamPriceLabelEl.textContent = parseFloat(config.pricePerColdFoam || DEFAULT_COLD_FOAM_PRICE).toFixed(2);
                customizeColdFoamSection.style.display = 'block';
            }
        }
        
        updateTotalPrice();
        customizationModal.style.display = 'block';
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

        if (config.milkOptions && customizeMilkSection.style.display !== 'none') {
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
            const orderItem = {
                itemId: currentMenuItem._id,
                name: currentMenuItem.name,
                basePriceSnapshot: parseFloat(currentMenuItem.price),
                quantity: (config.allowQuantitySelection && typeof config.allowQuantitySelection === 'object' && customizeQuantitySection.style.display !== 'none' ? parseInt(customizeQuantityInput.value) : 1),
                customizations: {},
                finalPrice: parseFloat(modalTotalPriceEl.textContent)
            };
            
            if (config.allowSizes && customizeSizeSection.style.display !== 'none' && !(config.allowQuantitySelection && typeof config.allowQuantitySelection === 'object')) {
                const selectedSizeOption = customizeSizeSelect.options[customizeSizeSelect.selectedIndex];
                orderItem.customizations.size = {
                    name: selectedSizeOption.textContent.split(' (')[0],
                    modifier: parseFloat(selectedSizeOption.dataset.priceModifier || 0)
                };
            }
            if (config.allowEspressoShots && typeof config.allowEspressoShots === 'object' && customizeEspressoShotsSection.style.display !== 'none') {
                const numShots = parseInt(customizeEspressoShotsInput.value) || 0;
                if (numShots > 0) {
                    orderItem.customizations.extraEspressoShots = {
                        quantity: numShots,
                        pricePerShot: parseFloat(config.allowEspressoShots.pricePerExtraShot || DEFAULT_ESPRESSO_SHOT_PRICE)
                    };
                }
            }

            if (config.syrups && customizeSyrupSection.style.display !== 'none') {
                const selectedSyrupOption = customizeSyrupSelect.options[customizeSyrupSelect.selectedIndex];
                if (selectedSyrupOption && selectedSyrupOption.value) {
                    orderItem.customizations.syrup = {
                        inventoryId: selectedSyrupOption.value,
                        name: selectedSyrupOption.dataset.itemName, // Use stored itemName
                        price: parseFloat(selectedSyrupOption.dataset.price || 0)
                    };
                }
            }
            if (config.toppings && customizeToppingSection.style.display !== 'none') {
                const selectedToppingOption = customizeToppingSelect.options[customizeToppingSelect.selectedIndex];
                if (selectedToppingOption && selectedToppingOption.value) {
                     orderItem.customizations.topping = {
                        inventoryId: selectedToppingOption.value,
                        name: selectedToppingOption.dataset.itemName, // Use stored itemName
                        price: parseFloat(selectedToppingOption.dataset.price || 0)
                    };
                }
            }
            if (config.milkOptions && customizeMilkSection.style.display !== 'none') {
                const selectedMilkOption = customizeMilkSelect.options[customizeMilkSelect.selectedIndex];
                if (selectedMilkOption && selectedMilkOption.value) {
                    orderItem.customizations.milk = {
                        inventoryId: selectedMilkOption.value,
                        name: selectedMilkOption.dataset.itemName, // Assumes dataset.itemName is set in populateSelectWithOptions
                        price: parseFloat(selectedMilkOption.dataset.price || 0)
                    };
                } else if (config.milkOptions.default && !selectedMilkOption.value) {
                }
            }
            if (config.allowColdFoam && customizeColdFoamSection.style.display !== 'none' && customizeColdFoamCheckbox.checked) {
                orderItem.customizations.coldFoam = {
                    added: true,
                    price: parseFloat(config.pricePerColdFoam || DEFAULT_COLD_FOAM_PRICE)
                };
            }

            console.log("Item Added to Order (concept):", orderItem);
            alert(`${orderItem.name} customized and (conceptually) added to order! Final Price: $${orderItem.finalPrice.toFixed(2)}`);
            closeCustomizationModal();
        });
    }

    customizeSizeSelect.addEventListener('change', updateTotalPrice);
    customizeEspressoShotsInput.addEventListener('input', updateTotalPrice);
    customizeSyrupSelect.addEventListener('change', updateTotalPrice);

    if (modalAddToCartBtn) {
        modalAddToCartBtn.addEventListener('click', () => {
            if (!currentMenuItem) return;

            const selectedSizeOption = customizeSizeSelect.options[customizeSizeSelect.selectedIndex];
            const selectedSyrupOption = customizeSyrupSelect.options[customizeSyrupSelect.selectedIndex];

            const orderItem = {
                itemId: currentMenuItem._id,
                name: currentMenuItem.name,
                basePrice: parseFloat(currentMenuItem.price),
                size: {
                    name: selectedSizeOption.textContent.split(' (')[0], // e.g., "Small"
                    modifier: parseFloat(selectedSizeOption.dataset.priceModifier || 0)
                },
                extraShots: parseInt(customizeEspressoShotsInput.value) || 0,
                espressoShotPrice: ESPRESSO_SHOT_PRICE,
                syrup: null,
                totalPrice: parseFloat(modalTotalPriceEl.textContent)
            };

            if (selectedSyrupOption && selectedSyrupOption.value) {
                orderItem.syrup = {
                    id: selectedSyrupOption.value,
                    name: selectedSyrupOption.textContent.split(' (')[0], // e.g., "Vanilla Syrup"
                    price: parseFloat(selectedSyrupOption.dataset.price || 0)
                };
            }

            console.log("Item Added to Order (concept):", orderItem);
            alert(`${orderItem.name} customized and (conceptually) added to order! Total: $${orderItem.totalPrice.toFixed(2)}`);
            // TODO: Implement actual add to cart functionality
            closeCustomizationModal();
        });
    }


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