const { TestDataFactory, TestAssertions } = require('../helpers/testUtils');
const productService = require('../../src/services/productService');

describe('ProductService', () => {
  let category;

  beforeEach(async () => {
    category = await TestDataFactory.createCategory();
  });

  describe('createProduct', () => {
    test('should create a new product successfully', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test product description',
        price: 99.99,
        stock: 100,
        categoryId: category.id,
        lowStockAlert: 10
      };

      const result = await productService.createProduct(productData, 1);

      TestAssertions.expectValidProduct(result);
      expect(result.name).toBe(productData.name);
      expect(result.description).toBe(productData.description);
      expect(result.price).toBe(productData.price);
      expect(result.stock).toBe(productData.stock);
      expect(result.categoryId).toBe(productData.categoryId);
      expect(result.slug).toBe('test-product');
    });

    test('should throw error for non-existent category', async () => {
      const productData = {
        name: 'Test Product',
        price: 99.99,
        stock: 100,
        categoryId: 99999
      };

      await expect(productService.createProduct(productData, 1))
        .rejects.toThrow('CATEGORY_NOT_FOUND');
    });

    test('should throw error for duplicate slug', async () => {
      const productData = {
        name: 'Duplicate Product',
        price: 99.99,
        stock: 100,
        categoryId: category.id
      };

      // Create first product
      await productService.createProduct(productData, 1);

      // Try to create product with same name (same slug)
      await expect(productService.createProduct(productData, 1))
        .rejects.toThrow('PRODUCT_SLUG_EXISTS');
    });

    test('should generate correct slug from product name', async () => {
      const productData = {
        name: 'Test Product With Spaces & Special Characters!',
        price: 99.99,
        stock: 100,
        categoryId: category.id
      };

      const result = await productService.createProduct(productData, 1);

      expect(result.slug).toBe('test-product-with-spaces-special-characters');
    });
  });

  describe('updateProduct', () => {
    test('should update product successfully', async () => {
      const product = await TestDataFactory.createProduct(category.id);
      const updateData = {
        name: 'Updated Product Name',
        price: 149.99,
        stock: 50
      };

      const result = await productService.updateProduct(product.id, updateData, 1);

      expect(result.name).toBe(updateData.name);
      expect(result.price).toBe(updateData.price);
      expect(result.stock).toBe(updateData.stock);
      expect(result.id).toBe(product.id);
    });

    test('should throw error for non-existent product', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 149.99
      };

      await expect(productService.updateProduct(99999, updateData, 1))
        .rejects.toThrow('PRODUCT_NOT_FOUND');
    });
  });

  describe('getProducts', () => {
    test('should return paginated products', async () => {
      // Create multiple products
      await TestDataFactory.createProduct(category.id, { name: 'Product 1' });
      await TestDataFactory.createProduct(category.id, { name: 'Product 2' });
      await TestDataFactory.createProduct(category.id, { name: 'Product 3' });

      const result = await productService.getProducts({
        page: 1,
        limit: 2
      });

      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('pagination');
      expect(result.products).toHaveLength(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
    });

    test('should filter products by category', async () => {
      const category2 = await TestDataFactory.createCategory({ name: 'Category 2' });
      
      await TestDataFactory.createProduct(category.id, { name: 'Product 1' });
      await TestDataFactory.createProduct(category2.id, { name: 'Product 2' });

      const result = await productService.getProducts({
        categoryId: category.id
      });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].categoryId).toBe(category.id);
    });

    test('should search products by name', async () => {
      await TestDataFactory.createProduct(category.id, { name: 'iPhone 14' });
      await TestDataFactory.createProduct(category.id, { name: 'Samsung Galaxy' });
      await TestDataFactory.createProduct(category.id, { name: 'iPhone 13' });

      const result = await productService.getProducts({
        search: 'iPhone'
      });

      expect(result.products).toHaveLength(2);
      expect(result.products.every(p => p.name.includes('iPhone'))).toBe(true);
    });
  });

  describe('reserveStock', () => {
    test('should reserve stock successfully', async () => {
      const product = await TestDataFactory.createProduct(category.id, { stock: 100 });

      const result = await productService.reserveStock(product.id, 10);

      expect(result.reservedStock).toBe(10);
      expect(result.stock).toBe(100); // Original stock unchanged
    });

    test('should throw error for insufficient stock', async () => {
      const product = await TestDataFactory.createProduct(category.id, { 
        stock: 5,
        reservedStock: 3
      });

      await expect(productService.reserveStock(product.id, 5))
        .rejects.toThrow('INSUFFICIENT_STOCK');
    });

    test('should throw error for non-existent product', async () => {
      await expect(productService.reserveStock(99999, 10))
        .rejects.toThrow('PRODUCT_NOT_FOUND');
    });
  });

  describe('releaseStock', () => {
    test('should release reserved stock successfully', async () => {
      const product = await TestDataFactory.createProduct(category.id, { 
        stock: 100,
        reservedStock: 20
      });

      const result = await productService.releaseStock(product.id, 10);

      expect(result.reservedStock).toBe(10);
    });

    test('should not release more than reserved stock', async () => {
      const product = await TestDataFactory.createProduct(category.id, { 
        stock: 100,
        reservedStock: 5
      });

      await expect(productService.releaseStock(product.id, 10))
        .rejects.toThrow('INVALID_RELEASE_AMOUNT');
    });
  });

  describe('checkLowStock', () => {
    test('should identify products with low stock', async () => {
      await TestDataFactory.createProduct(category.id, { 
        name: 'Low Stock Product',
        stock: 3,
        lowStockAlert: 5
      });
      await TestDataFactory.createProduct(category.id, { 
        name: 'Normal Stock Product',
        stock: 50,
        lowStockAlert: 5
      });

      const result = await productService.checkLowStock();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Low Stock Product');
    });
  });
});