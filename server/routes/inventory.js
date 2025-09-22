const router = require('express').Router();
const ownerAuth = require('../middleware/ownerAuth');
let InventoryItem = require('../models/inventory.model');

router.get('/', async (req, res) => {
  try {
    const items = await InventoryItem.find().sort({ name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching inventory: ' + err.message });
  }
});

router.post('/add', ownerAuth, async (req, res) => {
  try {
    const { itemName, itemType, quantityInStock, unit, lowStockThreshold } = req.body;
    if (!itemName || !itemType || !unit) {
      return res.status(400).json({ msg: 'Please enter item name, item type, and unit.' });
    }
    const newItem = new InventoryItem({ 
      itemName, 
      itemType, 
      quantityInStock: quantityInStock || 0, 
      unit,
      lowStockThreshold: lowStockThreshold || 10
    });
    const savedItem = await newItem.save();
    res.json(savedItem);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ msg: messages[0] });
    }
    if (err.code === 11000) {
      return res.status(400).json({ msg: `An inventory item named "${req.body.itemName}" already exists.` });
    }
    res.status(500).json({ error: 'Server error adding item: ' + err.message });
  }
});

router.put('/update/:id', ownerAuth, async (req, res) => {
  try {
    const updatedItem = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } 
    );
     if (!updatedItem) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.json(updatedItem);
  } catch (err) {
    // Also add robust error handling here
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ msg: messages[0] });
    }
    res.status(500).json({ error: 'Server error updating item: ' + err.message });
  }
});

// Alternative route for direct inventory updates (used by frontend)
router.put('/:id', ownerAuth, async (req, res) => {
  try {
    const updatedItem = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } 
    );
     if (!updatedItem) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.json(updatedItem);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ msg: messages[0] });
    }
    res.status(500).json({ error: 'Server error updating item: ' + err.message });
  }
});

router.delete('/delete/:id', ownerAuth, async (req, res) => {
    try {
        const deletedItem = await InventoryItem.findByIdAndDelete(req.params.id);
        if (!deletedItem) {
            return res.status(404).json({ msg: 'Item not found' });
        }
        res.json({ msg: 'Item deleted', item: deletedItem });
    } catch (err) {
        res.status(500).json({ error: 'Server error deleting item: ' + err.message });
    }
});

module.exports = router;