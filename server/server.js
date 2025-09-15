const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());

const uri = process.env.ATLAS_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
})

const productsRouter = require('./routes/products');
const usersRouter = require('./routes/users');
const ordersRouter = require('./routes/orders');
const beansRouter = require('./routes/beans');
const coffeeLogsRouter = require('./routes/coffeeLogs');
const inventoryRouter = require('./routes/inventory');
const settingsRouter = require('./routes/settings');
const promoCodesRouter = require('./routes/promoCodes');
const paymentsRouter = require('./routes/payments');
const beanBagsRouter = require('./routes/beanBags');

app.use('/products', productsRouter);
app.use('/users', usersRouter);
app.use('/orders', ordersRouter);
app.use('/beans', beansRouter);
app.use('/coffeelogs', coffeeLogsRouter);
app.use('/inventory', inventoryRouter);
app.use('/settings', settingsRouter);
app.use('/promocodes', promoCodesRouter);
app.use('/payments', paymentsRouter);
app.use('/beanbags', beanBagsRouter);

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '..', 'client', 'build', 'index.html'));
    });
}

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});