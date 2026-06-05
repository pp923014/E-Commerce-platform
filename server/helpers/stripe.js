// helpers/stripe.js
require('dotenv').config();
const Stripe = require('stripe');

module.exports = Stripe(process.env.STRIPE_SECRET_KEY);