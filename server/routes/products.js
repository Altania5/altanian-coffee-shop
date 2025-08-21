const router = require('express').Router();
let Product = require('../models/product.model');
const ownerAuth = require('../middleware/ownerAuth');

router.route('/').get((req, res) => {
  Product.find()
    .populate({
        path: 'recipe.item',
        model: 'InventoryItem'
    })
    .then(products => res.json(products))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.post('/add', ownerAuth, async (req, res) => {
    try {
        const { name, description, price, imageUrl, recipe, isAvailable, category, canBeModified } = req.body;
        const newProduct = new Product({ name, description, price, imageUrl, recipe, isAvailable, category, canBeModified });
        const savedProduct = await newProduct.save();
        res.json(savedProduct);
    } catch (err) {
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

router.put('/update/:id', ownerAuth, async (req, res) => {
    try {
        const { name, description, price, imageUrl, recipe, isAvailable, category, canBeModified } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { name, description, price, imageUrl, recipe, isAvailable, category, canBeModified },
            { new: true, runValidators: true }
        );
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

router.delete('/delete/:id', ownerAuth, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Product deleted.' });
    } catch (err) {
        res.status(400).json({ error: 'Error: ' + err.message });
    }
});

module.exports = router;