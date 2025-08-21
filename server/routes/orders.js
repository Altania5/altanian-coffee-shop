const router = require('express').Router();
const mongoose = require('mongoose');
let Order = require('../models/order.model');
let Product = require('../models/product.model');
let InventoryItem = require('../models/inventory.model');
const auth = require('../middleware/auth');

router.route('/').get((req, res) => {
    Order.find()
        .populate('user', 'username')
        .populate('products.product')
        .then(orders => res.json(orders))
        .catch(err => res.status(400).json('Error: ' + err));
});

router.get('/usual', auth, async (req, res) => {
    try {
        const result = await Order.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(req.user) } },
            { $unwind: '$products' },
            { $group: {
                _id: '$products.product',
                totalOrdered: { $sum: '$products.quantity' }
            }},
            { $sort: { totalOrdered: -1 } },
            { $limit: 1 },
            { $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productDetails'
            }},
            { $unwind: '$productDetails' },
            { $project: {
                _id: 0,
                product: '$productDetails'
            }}
        ]);

        if (result.length > 0) {
            res.json(result[0].product);
        } else {
            res.json(null); // No orders found for this user
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- (The rest of the file is unchanged) ---
router.post('/add', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { cart, total } = req.body;
    const userId = req.user;

    for (const cartItem of cart) {
      const originalProductId = cartItem._id.toString().split('{')[0];
      
      const product = await Product.findById(originalProductId).populate('recipe.item').session(session);
      
      if (!product || !product.isAvailable) {
        throw new Error(`Product "${cartItem.name}" is not available.`);
      }

      for (const ingredient of product.recipe) {
        if (!ingredient.item) {
             throw new Error(`Inventory item for recipe of "${product.name}" not found.`);
        }
        if (ingredient.item.quantity < ingredient.quantityRequired * cartItem.quantity) {
          throw new Error(`Not enough stock for "${ingredient.item.name}" to make "${product.name}".`);
        }
        ingredient.item.quantity -= ingredient.quantityRequired * cartItem.quantity;
        await ingredient.item.save({ session });
      }
    }

    const products = cart.map(item => ({
      product: item._id.toString().split('{')[0], // Save original ID
      quantity: item.quantity,
    }));

    const newOrder = new Order({
      user: userId,
      products: products,
      total: total
    });

    const savedOrder = await newOrder.save({ session });
    
    await session.commitTransaction();
    res.json(savedOrder);

  } catch (err) {
    await session.abortTransaction();
    // Use err.message to send back specific inventory errors
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

router.get('/myorders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user })
            .populate('products.product', 'name price')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;