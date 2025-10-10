const router = require('express').Router();
let Product = require('../models/product.model');
const ownerAuth = require('../middleware/ownerAuth');
const { dualAuth } = require('../middleware/dualAuth');
const { checkProductAvailability, updateProductAvailability, getUnavailableProducts } = require('../utils/productAvailability');

router.route('/').get((req, res) => {
  Product.find()
    .populate({
        path: 'recipe.item',
        model: 'InventoryItem',
        select: '_id itemName name unit quantityInStock isAvailable'
    })
    .then(products => {
        console.log('Products fetched:', products.length, 'products');
        products.forEach(product => {
            console.log(`Product ${product.name}: Available=${product.isAvailable}, ManuallySet=${product.availabilityManuallySet}, RecipeItems=${product.recipe.length}`);
        });
        res.json(products);
    })
    .catch(err => res.status(400).json('Error: ' + err));
});

router.post('/add', dualAuth, async (req, res) => {
    try {
        // Check owner access
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied - owner required' });
        }

        const { name, description, price, imageUrl, recipe, isAvailable, category, canBeModified } = req.body;
        
        // Mark availability as manually set if explicitly provided
        const availabilityManuallySet = req.body.hasOwnProperty('isAvailable');
        
        const newProduct = new Product({ 
            name, description, price, imageUrl, recipe, 
            isAvailable, category, canBeModified, 
            availabilityManuallySet 
        });
        const savedProduct = await newProduct.save();
        
        // Populate recipe and check availability
        await savedProduct.populate('recipe.item');
        const { isAvailable: calculatedAvailability, missingIngredients } = await checkProductAvailability(savedProduct);
        
        // Only update availability if it wasn't manually set
        if (!availabilityManuallySet && savedProduct.isAvailable !== calculatedAvailability) {
            savedProduct.isAvailable = calculatedAvailability;
            await savedProduct.save();
        }
        
        res.json({
            product: savedProduct,
            availability: {
                isAvailable: savedProduct.isAvailable,
                calculatedAvailability,
                manuallySet: availabilityManuallySet,
                missingIngredients
            }
        });
    } catch (err) {
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

router.put('/update/:id', dualAuth, async (req, res) => {
    try {
        // Check owner access
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied - owner required' });
        }

        const { name, description, price, imageUrl, recipe, isAvailable, category, canBeModified } = req.body;
        
        // Check if availability is being manually set
        const availabilityManuallySet = req.body.hasOwnProperty('isAvailable');
        
        const updateData = { 
            name, description, price, imageUrl, recipe, 
            isAvailable, category, canBeModified 
        };
        
        // Only update availabilityManuallySet if isAvailable is explicitly provided
        if (availabilityManuallySet) {
            updateData.availabilityManuallySet = true;
        }
        
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        // Populate recipe and check availability
        await updatedProduct.populate('recipe.item');
        const { isAvailable: calculatedAvailability, missingIngredients } = await checkProductAvailability(updatedProduct);
        
        // Only update availability if it wasn't manually set
        if (!availabilityManuallySet && updatedProduct.isAvailable !== calculatedAvailability) {
            updatedProduct.isAvailable = calculatedAvailability;
            await updatedProduct.save();
        }
        
        res.json({
            product: updatedProduct,
            availability: {
                isAvailable: updatedProduct.isAvailable,
                calculatedAvailability,
                manuallySet: updatedProduct.availabilityManuallySet,
                missingIngredients
            }
        });
    } catch (err) {
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

router.delete('/delete/:id', dualAuth, async (req, res) => {
    try {
        // Check owner access
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied - owner required' });
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Product deleted.' });
    } catch (err) {
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

// Route to check availability of a specific product
router.get('/:id/availability', dualAuth, async (req, res) => {
    try {
        // Check owner access
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied - owner required' });
        }

        const product = await Product.findById(req.params.id).populate('recipe.item');
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const { isAvailable, missingIngredients } = await checkProductAvailability(product);
        
        res.json({
            productId: product._id,
            productName: product.name,
            isAvailable,
            missingIngredients
        });
    } catch (err) {
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

// Route to get all unavailable products
router.get('/unavailable/list', dualAuth, async (req, res) => {
    try {
        // Check owner access
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied - owner required' });
        }

        const unavailableProducts = await getUnavailableProducts();
        res.json({
            success: true,
            unavailableProducts
        });
    } catch (err) {
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

// Route to manually update a product's availability
router.post('/:id/update-availability', dualAuth, async (req, res) => {
    try {
        // Check owner access
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied - owner required' });
        }

        const { forceUpdate = false } = req.body;
        const result = await updateProductAvailability(req.params.id, forceUpdate);
        res.json({
            success: true,
            message: 'Product availability updated',
            result
        });
    } catch (err) {
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

// Route to manually set product availability (override automatic calculation)
router.post('/:id/set-availability', dualAuth, async (req, res) => {
    try {
        // Check owner access
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied - owner required' });
        }

        const { isAvailable } = req.body;
        
        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({ error: 'isAvailable must be a boolean value' });
        }
        
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { 
                isAvailable,
                availabilityManuallySet: true 
            },
            { new: true }
        );
        
        if (!updatedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({
            success: true,
            message: 'Product availability manually set',
            product: updatedProduct
        });
    } catch (err) {
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

// Route to fix latte availability (debugging)
router.post('/fix-latte', dualAuth, async (req, res) => {
    try {
        // Check owner access
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied - owner required' });
        }

        const latte = await Product.findOne({ name: /latte/i });
        
        if (!latte) {
            return res.status(404).json({ error: 'Latte product not found' });
        }
        
        // Force set as available
        latte.isAvailable = true;
        latte.availabilityManuallySet = true;
        await latte.save();
        
        console.log('✅ Fixed latte availability:', latte.name, 'Available:', latte.isAvailable);
        
        res.json({
            success: true,
            message: 'Latte availability fixed',
            product: latte
        });
    } catch (err) {
        console.error('❌ Error fixing latte:', err);
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

module.exports = router;