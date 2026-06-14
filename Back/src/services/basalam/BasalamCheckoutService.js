/**
 * Basalam Checkout Service
 * Handles the complete checkout flow for Basalam products
 */

const BasalamApiClient = require('./BasalamApiClient');
const BasalamOrderRepository = require('../../repositories/BasalamOrderRepository');
const cartService = require('../cartService');
const notificationService = require('../notificationService');
const { BasalamError, BasalamErrorType } = require('../../types/basalam');

class BasalamCheckoutService {
  constructor() {
    this.apiClient = new BasalamApiClient();
  }

  /**
   * Validate cart contains only Basalam products
   * @param {Object} cart - Cart object with items
   * @returns {Promise<Object>} { valid, errors, basalamItems }
   */
  async validateBasalamCart(cart) {
    const errors = [];
    const basalamItems = [];
    const nonBasalamProducts = [];

    // Check if cart is empty
    if (!cart.items || cart.items.length === 0) {
      return {
        valid: false,
        errors: ['سبد خرید خالی است'],
        basalamItems: [],
      };
    }

    // Check each item for Basalam product ID
    for (const item of cart.items) {
      if (!item.product.basalamProductId) {
        nonBasalamProducts.push({
          id: item.product.id,
          name: item.product.name,
        });
      } else {
        // Validate stock availability
        if (item.product.availableStock < item.quantity) {
          errors.push(
            `محصول "${item.product.name}" موجودی کافی ندارد. موجودی: ${item.product.availableStock}`
          );
        } else {
          basalamItems.push({
            product_id: parseInt(item.product.basalamProductId),
            quantity: item.quantity,
            productId: item.product.id,
            name: item.product.name,
            price: item.product.effectivePrice,
            image: item.product.images?.[0]?.url || null,
          });
        }
      }
    }

    // Add error if non-Basalam products found
    if (nonBasalamProducts.length > 0) {
      errors.push(
        `سبد خرید شما محصولات غیر بسلامی دارد: ${nonBasalamProducts.map(p => p.name).join(', ')}`
      );
    }

    return {
      valid: errors.length === 0 && basalamItems.length > 0,
      errors,
      basalamItems,
      nonBasalamProducts,
    };
  }

  /**
   * Initiate checkout with Basalam products
   * @param {number} userId - User ID
   * @param {number} addressId - Shipping address ID
   * @param {number} shippingMethodId - Basalam shipping method ID
   * @param {string} callbackUrl - URL for payment callback
   * @returns {Promise<Object>} { orderId, paymentUrl, basalamOrderId }
   */
  async initiateCheckout(userId, addressId, shippingMethodId, callbackUrl) {
    try {
      console.log('[BasalamCheckoutService] Initiating checkout for user:', userId);

      // Get user's cart
      const cart = await cartService.getOrCreateCart(userId);

      // Validate cart contains only Basalam products
      const validation = await this.validateBasalamCart(cart);
      if (!validation.valid) {
        throw new BasalamError(
          BasalamErrorType.VALIDATION_ERROR,
          validation.errors[0],
          { errors: validation.errors, nonBasalamProducts: validation.nonBasalamProducts }
        );
      }

      // Get shipping address
      const { getPrismaClient } = require('../../utils/database');
      const address = await getPrismaClient().address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!address) {
        throw new BasalamError(
          BasalamErrorType.VALIDATION_ERROR,
          'آدرس ارسال یافت نشد'
        );
      }

      // Get user info for contact details
      const user = await getPrismaClient().user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BasalamError(
          BasalamErrorType.VALIDATION_ERROR,
          'کاربر یافت نشد'
        );
      }

      // Create order data
      const orderData = {
        userId,
        items: validation.basalamItems,
        shippingAddress: {
          province: address.province,
          city: address.city,
          address: address.address,
          postalCode: address.postalCode,
        },
        contactInfo: {
          fullName: user.name || address.recipientName || 'مشتری',
          phone: user.phone || address.phone,
          email: user.email || null,
        },
        callbackUrl,
        shippingMethodId,
      };

      // Create Basalam order via API
      const basalamOrderResult = await this.createBasalamOrder(orderData);

      console.log('[BasalamCheckoutService] Checkout completed successfully:', {
        orderId: basalamOrderResult.orderId,
        basalamOrderId: basalamOrderResult.basalamOrderId,
      });

      return basalamOrderResult;
    } catch (error) {
      console.error('[BasalamCheckoutService] Checkout error:', error);

      if (error instanceof BasalamError) {
        throw error;
      }

      throw new BasalamError(
        BasalamErrorType.ORDER_CREATION_FAILED,
        'خطا در ایجاد سفارش',
        { originalError: error.message }
      );
    }
  }

  /**
   * Create order in Basalam via basket/invoice/payment flow
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} { orderId, basalamOrderId, paymentUrl }
   */
  async createBasalamOrder(orderData) {
    try {
      console.log('[BasalamCheckoutService] Creating Basalam order');

      // Step 1: Add items to basket
      const basketItems = orderData.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }));

      await this.apiClient.addToBasket(basketItems);
      console.log('[BasalamCheckoutService] Items added to basket');

      // Step 2: Create invoice from basket
      const invoiceResponse = await this.apiClient.createInvoice();
      const invoiceId = invoiceResponse.invoice_id || invoiceResponse.id;

      if (!invoiceId) {
        throw new BasalamError(
          BasalamErrorType.ORDER_CREATION_FAILED,
          'خطا در ایجاد فاکتور',
          { invoiceResponse }
        );
      }

      console.log('[BasalamCheckoutService] Invoice created:', invoiceId);

      // Step 3: Calculate total amount
      const totalAmount = orderData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Step 4: Create payment
      const paymentData = {
        pay_drivers: {
          gateway: {
            amount: totalAmount,
          },
        },
        callback: orderData.callbackUrl,
      };

      const paymentResponse = await this.apiClient.createPayment(invoiceId, paymentData);
      const paymentUrl = paymentResponse.payment_url || paymentResponse.url;

      if (!paymentUrl) {
        throw new BasalamError(
          BasalamErrorType.ORDER_CREATION_FAILED,
          'خطا در ایجاد لینک پرداخت',
          { paymentResponse }
        );
      }

      console.log('[BasalamCheckoutService] Payment URL generated');

      // Step 5: Store order in local database
      const order = await BasalamOrderRepository.create({
        userId: orderData.userId,
        basalamOrderId: invoiceId, // Using invoice ID as order ID
        orderNumber: null,
        status: 'pending_payment',
        totalAmount,
        itemsJson: JSON.stringify(orderData.items),
        shippingAddressJson: JSON.stringify(orderData.shippingAddress),
        contactInfoJson: JSON.stringify(orderData.contactInfo),
        paymentUrl,
      });

      // Add initial status history
      await BasalamOrderRepository.addStatusHistory(
        order.id,
        'pending_payment',
        'سفارش ایجاد شد و در انتظار پرداخت'
      );

      console.log('[BasalamCheckoutService] Order stored in database:', order.id);

      // Send order confirmation notification (non-blocking)
      notificationService.sendBasalamOrderConfirmation(order.id).catch(error => {
        console.error('[BasalamCheckoutService] Failed to send order confirmation notification:', error);
        // Continue - notification failure should not block order creation
      });

      return {
        orderId: order.id,
        basalamOrderId: invoiceId,
        paymentUrl,
        totalAmount,
      };
    } catch (error) {
      console.error('[BasalamCheckoutService] Create order error:', error);

      if (error instanceof BasalamError) {
        throw error;
      }

      throw new BasalamError(
        BasalamErrorType.ORDER_CREATION_FAILED,
        'خطا در ایجاد سفارش در بسلام',
        { originalError: error.message }
      );
    }
  }

  /**
   * Handle payment callback from Basalam
   * @param {Object} callbackData - Callback parameters
   * @param {number} callbackData.pay_id - Payment ID
   * @param {string} callbackData.callback - Callback token
   * @param {string} callbackData.status - Payment status
   * @returns {Promise<Object>} { success, orderId, order, redirectUrl }
   */
  async handlePaymentCallback(callbackData) {
    try {
      const { pay_id, callback, status } = callbackData;

      console.log('[BasalamCheckoutService] Processing payment callback:', {
        pay_id,
        status,
      });

      // Verify payment with Basalam
      const verificationResult = await this.verifyPayment(pay_id);

      // Determine order status based on payment result
      const isSuccess = status === 'success' && verificationResult.success;
      const newStatus = isSuccess ? 'paid' : 'payment_failed';

      // Find order by payment URL or transaction ID
      // Note: We need to find the order associated with this payment
      // For now, we'll use the callback token or payment ID to locate it
      const { getPrismaClient } = require('../../utils/database');
      const order = await getPrismaClient().basalamOrder.findFirst({
        where: {
          status: 'pending_payment',
          // We might need to store pay_id or callback token to match
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!order) {
        throw new BasalamError(
          BasalamErrorType.ORDER_NOT_FOUND,
          'سفارش مرتبط با این پرداخت یافت نشد'
        );
      }

      // Update order status
      await BasalamOrderRepository.updatePayment(order.id, {
        status: newStatus,
        transactionId: pay_id?.toString() || null,
        paidAt: isSuccess ? new Date() : null,
      });

      // Add status history
      await BasalamOrderRepository.addStatusHistory(
        order.id,
        newStatus,
        isSuccess ? 'پرداخت با موفقیت انجام شد' : 'پرداخت ناموفق بود'
      );

      // Clear cart on successful payment
      if (isSuccess) {
        await this.clearBasalamItemsFromCart(order.userId);
        console.log('[BasalamCheckoutService] Cart cleared after successful payment');
      }

      // Send payment notification (non-blocking)
      const paymentStatus = isSuccess ? 'success' : 'failed';
      notificationService.sendBasalamPaymentNotification(order.id, paymentStatus).catch(error => {
        console.error('[BasalamCheckoutService] Failed to send payment notification:', error);
        // Continue - notification failure should not block payment processing
      });

      console.log('[BasalamCheckoutService] Payment callback processed:', {
        orderId: order.id,
        status: newStatus,
      });

      return {
        success: isSuccess,
        orderId: order.id,
        order: await BasalamOrderRepository.findById(order.id),
        redirectUrl: isSuccess
          ? `/basalam/orders/${order.id}`
          : `/basalam/payment/failed?orderId=${order.id}`,
      };
    } catch (error) {
      console.error('[BasalamCheckoutService] Payment callback error:', error);

      if (error instanceof BasalamError) {
        throw error;
      }

      throw new BasalamError(
        BasalamErrorType.PAYMENT_FAILED,
        'خطا در پردازش نتیجه پرداخت',
        { originalError: error.message }
      );
    }
  }

  /**
   * Verify payment status with Basalam
   * @param {number} paymentId - Payment ID
   * @returns {Promise<Object>} { success, status, details }
   */
  async verifyPayment(paymentId) {
    try {
      console.log('[BasalamCheckoutService] Verifying payment:', paymentId);

      // Call Basalam API to verify payment
      // Note: The exact endpoint might vary based on Basalam's API
      const verificationResponse = await this.apiClient.get(`/payment/${paymentId}/verify`);

      const isSuccess =
        verificationResponse.status === 'paid' ||
        verificationResponse.status === 'success' ||
        verificationResponse.success === true;

      console.log('[BasalamCheckoutService] Payment verification result:', {
        paymentId,
        success: isSuccess,
        status: verificationResponse.status,
      });

      return {
        success: isSuccess,
        status: verificationResponse.status,
        details: verificationResponse,
      };
    } catch (error) {
      console.error('[BasalamCheckoutService] Payment verification error:', error);

      // If verification fails, we should mark as pending for manual review
      return {
        success: false,
        status: 'verification_failed',
        details: { error: error.message },
      };
    }
  }

  /**
   * Clear Basalam items from cart
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async clearBasalamItemsFromCart(userId) {
    try {
      await cartService.clearBasalamItems(userId);
      console.log('[BasalamCheckoutService] Cleared Basalam items from cart:', { userId });
    } catch (error) {
      console.error('[BasalamCheckoutService] Error clearing cart:', error);
      // Don't throw error - cart clearing is not critical
    }
  }

  /**
   * Get Basalam items from cart
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Basalam items
   */
  async getBasalamItems(userId) {
    return await cartService.getBasalamItems(userId);
  }

  /**
   * Check if cart has Basalam products
   * @param {Object} cart - Cart object
   * @returns {boolean} True if cart has Basalam products
   */
  hasBasalamProducts(cart) {
    return cartService.hasBasalamProducts(cart);
  }
}

module.exports = BasalamCheckoutService;
