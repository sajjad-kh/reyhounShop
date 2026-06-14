const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  constructor() {
    this.stripe = stripe;
  }

  /**
   * Create payment intent with Stripe
   * @param {Object} paymentData - Payment information
   * @param {number} paymentData.amount - Amount in cents (USD)
   * @param {string} paymentData.currency - Currency code (default: 'usd')
   * @param {string} paymentData.description - Payment description
   * @param {Object} paymentData.metadata - Additional metadata
   * @param {string} paymentData.customerEmail - Customer email
   * @returns {Promise<Object>} Payment intent result
   */
  async createPaymentIntent(paymentData) {
    try {
      const {
        amount,
        currency = 'usd',
        description,
        metadata = {},
        customerEmail
      } = paymentData;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount), // Ensure integer
        currency: currency.toLowerCase(),
        description,
        metadata: {
          ...metadata,
          integration: 'ecommerce-platform'
        },
        receipt_email: customerEmail,
        automatic_payment_methods: {
          enabled: true
        }
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        gatewayResponse: paymentIntent
      };
    } catch (error) {
      console.error('Stripe create payment intent error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code
      };
    }
  }

  /**
   * Retrieve payment intent status
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} Payment intent status
   */
  async retrievePaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        charges: paymentIntent.charges.data,
        gatewayResponse: paymentIntent
      };
    } catch (error) {
      console.error('Stripe retrieve payment intent error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code
      };
    }
  }

  /**
   * Confirm payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {Object} confirmationData - Confirmation data
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmPaymentIntent(paymentIntentId, confirmationData = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmationData
      );

      return {
        success: true,
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
        gatewayResponse: paymentIntent
      };
    } catch (error) {
      console.error('Stripe confirm payment intent error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code
      };
    }
  }

  /**
   * Create refund for a payment
   * @param {Object} refundData - Refund information
   * @param {string} refundData.paymentIntentId - Payment intent ID
   * @param {number} refundData.amount - Refund amount in cents (optional, full refund if not specified)
   * @param {string} refundData.reason - Refund reason
   * @param {Object} refundData.metadata - Additional metadata
   * @returns {Promise<Object>} Refund result
   */
  async createRefund(refundData) {
    try {
      const { paymentIntentId, amount, reason, metadata = {} } = refundData;

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount) : undefined,
        reason: reason || 'requested_by_customer',
        metadata: {
          ...metadata,
          integration: 'ecommerce-platform'
        }
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        gatewayResponse: refund
      };
    } catch (error) {
      console.error('Stripe create refund error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code
      };
    }
  }

  /**
   * Handle Stripe webhook events
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {Promise<Object>} Webhook processing result
   */
  async handleWebhook(payload, signature) {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!endpointSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );

      return {
        success: true,
        event,
        type: event.type,
        data: event.data
      };
    } catch (error) {
      console.error('Stripe webhook error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment method details
   * @param {string} paymentMethodId - Payment method ID
   * @returns {Promise<Object>} Payment method details
   */
  async getPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

      return {
        success: true,
        paymentMethod,
        type: paymentMethod.type,
        card: paymentMethod.card
      };
    } catch (error) {
      console.error('Stripe get payment method error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code
      };
    }
  }
}

module.exports = StripeService;