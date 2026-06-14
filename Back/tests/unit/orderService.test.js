const { TestDataFactory, TestAssertions } = require('../helpers/testUtils');
const orderService = require('../../src/services/orderService');

describe('OrderService', () => {
  let user;
  let category;
  let product;

  beforeEach(async () => {
    user = await TestDataFactory.createUser();
    category = await TestDataFactory.createCategory();
    product = await TestDataFactory.createProduct(category.id);
  });

  describe('createOrder', () => {
    test('should create order successfully with valid cart items', async () => {
      const cart = await TestDataFactory.createCart(user.id);
      await global.testDb.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: 2,
          price: product.price
        }
      });

      const orderData = {
        userId: user.id,
        cartId: cart.id,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        }
      };

      const result = await orderService.createOrder(orderData);

      TestAssertions.expectValidOrder(result);
      expect(result.userId).toBe(user.id);
      expect(result.status).toBe('PENDING');
      expect(result.totalAmount).toBe(product.price * 2);
      expect(result.trackingCode).toBeTruthy();
    });

    test('should throw error for empty cart', async () => {
      const cart = await TestDataFactory.createCart(user.id);
      const orderData = {
        userId: user.id,
        cartId: cart.id,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City'
        }
      };

      await expect(orderService.createOrder(orderData))
        .rejects.toThrow('CART_IS_EMPTY');
    });

    test('should throw error for insufficient stock', async () => {
      const lowStockProduct = await TestDataFactory.createProduct(category.id, { stock: 1 });
      const cart = await TestDataFactory.createCart(user.id);
      await global.testDb.cartItem.create({
        data: {
          cartId: cart.id,
          productId: lowStockProduct.id,
          quantity: 5,
          price: lowStockProduct.price
        }
      });

      const orderData = {
        userId: user.id,
        cartId: cart.id,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City'
        }
      };

      await expect(orderService.createOrder(orderData))
        .rejects.toThrow('INSUFFICIENT_STOCK');
    });
  });

  describe('updateOrderStatus', () => {
    test('should update order status successfully', async () => {
      const order = await TestDataFactory.createOrder(user.id);

      const result = await orderService.updateOrderStatus(order.id, 'PROCESSING', user.id);

      expect(result.status).toBe('PROCESSING');
      expect(result.id).toBe(order.id);
    });

    test('should throw error for invalid status transition', async () => {
      const order = await TestDataFactory.createOrder(user.id, { status: 'DELIVERED' });

      await expect(orderService.updateOrderStatus(order.id, 'PENDING', user.id))
        .rejects.toThrow('INVALID_STATUS_TRANSITION');
    });

    test('should throw error for non-existent order', async () => {
      await expect(orderService.updateOrderStatus(99999, 'PROCESSING', user.id))
        .rejects.toThrow('ORDER_NOT_FOUND');
    });
  });

  describe('getOrdersByUser', () => {
    test('should return user orders with pagination', async () => {
      await TestDataFactory.createOrder(user.id, { totalAmount: 100 });
      await TestDataFactory.createOrder(user.id, { totalAmount: 200 });

      const result = await orderService.getOrdersByUser(user.id, { page: 1, limit: 10 });

      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('pagination');
      expect(result.orders).toHaveLength(2);
      expect(result.orders.every(order => order.userId === user.id)).toBe(true);
    });

    test('should return empty array for user with no orders', async () => {
      const newUser = await TestDataFactory.createUser();

      const result = await orderService.getOrdersByUser(newUser.id, { page: 1, limit: 10 });

      expect(result.orders).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('cancelOrder', () => {
    test('should cancel order in PENDING status', async () => {
      const order = await TestDataFactory.createOrder(user.id, { status: 'PENDING' });

      const result = await orderService.cancelOrder(order.id, user.id);

      expect(result.status).toBe('CANCELLED');
    });

    test('should throw error for order that cannot be cancelled', async () => {
      const order = await TestDataFactory.createOrder(user.id, { status: 'DELIVERED' });

      await expect(orderService.cancelOrder(order.id, user.id))
        .rejects.toThrow('ORDER_CANNOT_BE_CANCELLED');
    });

    test('should throw error for unauthorized cancellation', async () => {
      const otherUser = await TestDataFactory.createUser();
      const order = await TestDataFactory.createOrder(otherUser.id);

      await expect(orderService.cancelOrder(order.id, user.id))
        .rejects.toThrow('UNAUTHORIZED_ORDER_ACCESS');
    });
  });

  describe('calculateOrderTotal', () => {
    test('should calculate order total correctly', async () => {
      const items = [
        { productId: product.id, quantity: 2, price: 50.00 },
        { productId: product.id, quantity: 1, price: 30.00 }
      ];

      const result = await orderService.calculateOrderTotal(items);

      expect(result.subtotal).toBe(130.00);
      expect(result.total).toBe(130.00);
    });

    test('should apply discount when provided', async () => {
      const items = [
        { productId: product.id, quantity: 2, price: 50.00 }
      ];

      const result = await orderService.calculateOrderTotal(items, { amount: 10, type: 'FIXED' });

      expect(result.subtotal).toBe(100.00);
      expect(result.discount).toBe(10.00);
      expect(result.total).toBe(90.00);
    });
  });
});