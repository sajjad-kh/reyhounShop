/**
 * Basalam Order Service
 * Handles order management with Basalam API
 */

const BasalamApiClient = require('./BasalamApiClient');
const BasalamOrderRepository = require('../../repositories/BasalamOrderRepository');
const notificationService = require('../notificationService');
const { BasalamError, BasalamErrorType } = require('../../types/basalam');

class BasalamOrderService {
  constructor() {
    this.apiClient = new BasalamApiClient();
  }

  /**
   * Create a new order in Basalam
   * @param {Object} orderData - Order data
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Order creation response
   */
  async createOrder(orderData, userId) {
    try {
      // Validate order data
      this.validateOrderData(orderData);

      // Prepare request for Basalam API
      const basalamRequest = {
        items: orderData.items,
        shipping_address: orderData.shippingAddress,
        contact_info: orderData.contactInfo,
        callback_url: orderData.callbackUrl,
      };

      // Call Basalam API to create order
      const basalamResponse = await this.apiClient.post('/orders', basalamRequest);

      // Store order in database cache
      const order = await BasalamOrderRepository.create({
        userId,
        basalamOrderId: basalamResponse.order_id,
        orderNumber: basalamResponse.order_number || null,
        status: 'pending_payment',
        totalAmount: this.calculateTotalAmount(orderData.items),
        itemsJson: JSON.stringify(orderData.items),
        shippingAddressJson: JSON.stringify(orderData.shippingAddress),
        contactInfoJson: JSON.stringify(orderData.contactInfo),
        paymentUrl: basalamResponse.payment_url,
      });

      // Create initial status history entry
      await BasalamOrderRepository.addStatusHistory(order.id, 'pending_payment', 'Order created');

      return {
        orderId: order.id,
        basalamOrderId: basalamResponse.order_id,
        paymentUrl: basalamResponse.payment_url,
        expiresAt: basalamResponse.expires_at,
      };
    } catch (error) {
      console.error('[BasalamOrderService] Create order error:', error);
      
      if (error instanceof BasalamError) {
        throw error;
      }
      
      throw new BasalamError(
        BasalamErrorType.ORDER_CREATION_FAILED,
        'Failed to create order',
        { originalError: error.message }
      );
    }
  }

  /**
   * Validate order data
   * @param {Object} orderData - Order data to validate
   * @throws {BasalamError} If validation fails
   */
  validateOrderData(orderData) {
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new BasalamError(
        BasalamErrorType.VALIDATION_ERROR,
        'Order must contain at least one item'
      );
    }

    for (const item of orderData.items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        throw new BasalamError(
          BasalamErrorType.VALIDATION_ERROR,
          'Invalid item data: productId and quantity are required'
        );
      }
    }

    if (!orderData.shippingAddress) {
      throw new BasalamError(
        BasalamErrorType.VALIDATION_ERROR,
        'Shipping address is required'
      );
    }

    const { province, city, address, postalCode } = orderData.shippingAddress;
    if (!province || !city || !address || !postalCode) {
      throw new BasalamError(
        BasalamErrorType.VALIDATION_ERROR,
        'Complete shipping address is required (province, city, address, postalCode)'
      );
    }

    if (!orderData.contactInfo) {
      throw new BasalamError(
        BasalamErrorType.VALIDATION_ERROR,
        'Contact information is required'
      );
    }

    const { fullName, phone } = orderData.contactInfo;
    if (!fullName || !phone) {
      throw new BasalamError(
        BasalamErrorType.VALIDATION_ERROR,
        'Contact information must include fullName and phone'
      );
    }

    if (!orderData.callbackUrl) {
      throw new BasalamError(
        BasalamErrorType.VALIDATION_ERROR,
        'Callback URL is required'
      );
    }
  }

  /**
   * Calculate total amount from items
   * @param {Array} items - Order items
   * @returns {number} Total amount
   */
  calculateTotalAmount(items) {
    return items.reduce((total, item) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      return total + (price * quantity);
    }, 0);
  }

  /**
   * Get orders list for a user
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Orders list with pagination
   */
  async getOrders(userId, filters = {}) {
    try {
      const { page = 1, limit = 10, status } = filters;

      // Fetch orders from database using repository
      const result = await BasalamOrderRepository.findByUserId(userId, {
        page,
        limit,
        status,
      });

      const { orders, pagination } = result;

      // Transform orders to response format
      const transformedOrders = orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber || `BO-${order.basalamOrderId}`,
        date: order.createdAt.toISOString(),
        totalAmount: order.totalAmount,
        status: order.status,
        itemsCount: JSON.parse(order.itemsJson).length,
      }));

      return {
        orders: transformedOrders,
        pagination,
      };
    } catch (error) {
      console.error('[BasalamOrderService] Get orders error:', error);
      throw new BasalamError(
        BasalamErrorType.NETWORK_ERROR,
        'Failed to fetch orders',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get order details
   * @param {number} orderId - Order ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} Order details
   */
  async getOrderDetails(orderId, userId) {
    try {
      // Fetch order from database with status history
      const order = await BasalamOrderRepository.findById(orderId, userId);

      if (!order) {
        throw new BasalamError(
          BasalamErrorType.ORDER_NOT_FOUND,
          'Order not found'
        );
      }

      // Parse JSON fields
      const items = JSON.parse(order.itemsJson);
      const shippingAddress = JSON.parse(order.shippingAddressJson);
      const contactInfo = JSON.parse(order.contactInfoJson);

      // Transform to response format
      return {
        id: order.id,
        orderNumber: order.orderNumber || `BO-${order.basalamOrderId}`,
        date: order.createdAt.toISOString(),
        status: order.status,
        totalAmount: order.totalAmount,
        items: items.map(item => ({
          productId: item.productId,
          title: item.title || 'Product',
          price: item.price,
          quantity: item.quantity,
          image: item.image || null,
          seller: item.seller || 'Basalam',
        })),
        shippingAddress,
        trackingCode: order.trackingCode || null,
        statusHistory: order.statusHistory.map(history => ({
          status: history.status,
          timestamp: history.createdAt.toISOString(),
          note: history.note || null,
        })),
        paymentInfo: {
          amount: order.totalAmount,
          method: 'Basalam Payment Gateway',
          transactionId: order.paymentTransactionId || null,
          paidAt: order.paidAt ? order.paidAt.toISOString() : null,
        },
      };
    } catch (error) {
      console.error('[BasalamOrderService] Get order details error:', error);
      
      if (error instanceof BasalamError) {
        throw error;
      }
      
      throw new BasalamError(
        BasalamErrorType.NETWORK_ERROR,
        'Failed to fetch order details',
        { originalError: error.message }
      );
    }
  }

  /**
   * Verify payment for an order
   * @param {number} orderId - Order ID
   * @param {string} transactionId - Transaction ID from payment gateway
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(orderId, transactionId, userId) {
    try {
      // Fetch order from database
      const order = await BasalamOrderRepository.findById(orderId, userId);

      if (!order) {
        throw new BasalamError(
          BasalamErrorType.ORDER_NOT_FOUND,
          'Order not found'
        );
      }

      // Call Basalam API to verify payment
      const verificationResponse = await this.apiClient.post(
        `/orders/${order.basalamOrderId}/verify`,
        { transaction_id: transactionId }
      );

      const isSuccess = verificationResponse.status === 'paid' || verificationResponse.success;
      const newStatus = isSuccess ? 'paid' : 'payment_failed';

      // Update order in database
      await BasalamOrderRepository.updatePayment(orderId, {
        status: newStatus,
        transactionId,
        paidAt: isSuccess ? new Date() : null,
      });

      // Add status history entry
      await BasalamOrderRepository.addStatusHistory(
        order.id,
        newStatus,
        isSuccess ? 'Payment verified successfully' : 'Payment verification failed'
      );

      return {
        success: isSuccess,
        order: await this.getOrderDetails(orderId, userId),
      };
    } catch (error) {
      console.error('[BasalamOrderService] Verify payment error:', error);
      
      if (error instanceof BasalamError) {
        throw error;
      }
      
      throw new BasalamError(
        BasalamErrorType.PAYMENT_FAILED,
        'Failed to verify payment',
        { originalError: error.message }
      );
    }
  }

  /**
   * Sync order status with Basalam API
   * @param {number} orderId - Order ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} Sync result
   */
  async syncOrderStatus(orderId, userId) {
    try {
      // Fetch order from database
      const order = await BasalamOrderRepository.findById(orderId, userId);

      if (!order) {
        throw new BasalamError(
          BasalamErrorType.ORDER_NOT_FOUND,
          'Order not found'
        );
      }

      // Fetch latest status from Basalam API
      const basalamOrder = await this.apiClient.get(`/orders/${order.basalamOrderId}`);

      const newStatus = basalamOrder.status;
      const statusChanged = order.status !== newStatus;

      // Update order if status changed
      if (statusChanged) {
        const oldStatus = order.status;
        
        await BasalamOrderRepository.update(orderId, {
          status: newStatus,
          orderNumber: basalamOrder.order_number || order.orderNumber,
          trackingCode: basalamOrder.tracking_code || order.trackingCode,
        });

        // Add status history entry
        await BasalamOrderRepository.addStatusHistory(
          order.id,
          newStatus,
          'Status synced from Basalam'
        );

        console.log(`[BasalamOrderService] Order ${orderId} status updated: ${oldStatus} -> ${newStatus}`);

        // Send status update notification (non-blocking)
        notificationService.sendBasalamOrderStatusUpdate(order.id, oldStatus, newStatus).catch(error => {
          console.error('[BasalamOrderService] Failed to send status update notification:', error);
          // Continue - notification failure should not block status sync
        });
      }

      return {
        order: await this.getOrderDetails(orderId, userId),
        updated: statusChanged,
      };
    } catch (error) {
      console.error('[BasalamOrderService] Sync order status error:', error);
      
      if (error instanceof BasalamError) {
        throw error;
      }
      
      throw new BasalamError(
        BasalamErrorType.NETWORK_ERROR,
        'Failed to sync order status',
        { originalError: error.message }
      );
    }
  }
}

module.exports = BasalamOrderService;
