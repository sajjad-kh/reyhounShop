const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/v1/test-data:
 *   get:
 *     summary: Get example test data for API testing
 *     tags: [Testing]
 *     description: Provides example data structures for testing API endpoints in Swagger UI
 *     responses:
 *       200:
 *         description: Example test data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userRegistration:
 *                   type: object
 *                   description: Example user registration data
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "test@example.com"
 *                     password:
 *                       type: string
 *                       example: "TestPass123!"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     phone:
 *                       type: string
 *                       example: "+1234567890"
 *                 userLogin:
 *                   type: object
 *                   description: Example login credentials
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "test@example.com"
 *                     password:
 *                       type: string
 *                       example: "TestPass123!"
 *                 productCreate:
 *                   type: object
 *                   description: Example product creation data
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Wireless Bluetooth Headphones"
 *                     description:
 *                       type: string
 *                       example: "High-quality wireless headphones with noise cancellation"
 *                     price:
 *                       type: integer
 *                       example: 9999
 *                     discountPrice:
 *                       type: integer
 *                       example: 7999
 *                     stock:
 *                       type: integer
 *                       example: 50
 *                     categoryId:
 *                       type: integer
 *                       example: 1
 *                     lowStockAlert:
 *                       type: integer
 *                       example: 10
 *                 orderCreate:
 *                   type: object
 *                   description: Example order creation data
 *                   properties:
 *                     addressId:
 *                       type: integer
 *                       example: 1
 *                     discountCode:
 *                       type: string
 *                       example: "SAVE10"
 *                 addToCart:
 *                   type: object
 *                   description: Example add to cart data
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *                 discountCode:
 *                   type: object
 *                   description: Example discount code creation
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "SAVE20"
 *                     type:
 *                       type: string
 *                       example: "PERCENTAGE"
 *                     value:
 *                       type: integer
 *                       example: 20
 *                     minimumPurchase:
 *                       type: integer
 *                       example: 5000
 *                     maxUses:
 *                       type: integer
 *                       example: 100
 *                     expiresAt:
 *                       type: string
 *                       example: "2025-12-31T23:59:59Z"
 *                 authTokens:
 *                   type: object
 *                   description: Example authentication tokens for testing
 *                   properties:
 *                     customerToken:
 *                       type: string
 *                       example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     adminToken:
 *                       type: string
 *                       example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     note:
 *                       type: string
 *                       example: "Use these tokens in the Authorization header. Click 'Authorize' button above to set them."
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Example test data for API testing',
    data: {
      userRegistration: {
        email: "test@example.com",
        password: "TestPass123!",
        name: "John Doe",
        phone: "+1234567890",
        birthDate: "1990-01-01"
      },
      userLogin: {
        email: "test@example.com",
        password: "TestPass123!"
      },
      productCreate: {
        name: "Wireless Bluetooth Headphones",
        description: "High-quality wireless headphones with noise cancellation and 20-hour battery life",
        price: 9999, // $99.99 in cents
        discountPrice: 7999, // $79.99 in cents
        stock: 50,
        categoryId: 1,
        lowStockAlert: 10
      },
      orderCreate: {
        addressId: 1,
        discountCode: "SAVE10"
      },
      addToCart: {
        productId: 1,
        quantity: 2
      },
      discountCode: {
        code: "SAVE20",
        type: "PERCENTAGE",
        value: 20,
        minimumPurchase: 5000, // $50.00 minimum
        maxUses: 100,
        expiresAt: "2025-12-31T23:59:59Z"
      },
      category: {
        name: "Electronics",
        description: "Electronic devices and accessories",
        parentId: null
      },
      address: {
        firstName: "John",
        lastName: "Doe",
        company: "Tech Corp",
        address1: "123 Main Street",
        address2: "Apt 4B",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "US",
        phone: "+1234567890",
        isDefault: true
      },
      review: {
        rating: 5,
        comment: "Excellent product! Highly recommended."
      },
      authTokens: {
        note: "After registering and logging in, copy the JWT token from the response and use it in the 'Authorize' button above",
        customerTokenExample: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        adminTokenExample: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        howToUse: [
          "1. Register a new user using POST /api/v1/auth/register",
          "2. Login using POST /api/v1/auth/login",
          "3. Copy the 'token' from the login response",
          "4. Click the 'Authorize' button at the top of this page",
          "5. Enter 'Bearer <your-token>' in the bearerAuth field",
          "6. Click 'Authorize' and 'Close'",
          "7. Now you can test protected endpoints"
        ]
      },
      testingWorkflow: {
        description: "Recommended testing workflow for the API",
        steps: [
          {
            step: 1,
            action: "Register User",
            endpoint: "POST /api/v1/auth/register",
            data: "Use userRegistration example above"
          },
          {
            step: 2,
            action: "Login User",
            endpoint: "POST /api/v1/auth/login",
            data: "Use userLogin example above"
          },
          {
            step: 3,
            action: "Authorize",
            description: "Copy token from login response and use 'Authorize' button"
          },
          {
            step: 4,
            action: "Create Category",
            endpoint: "POST /api/v1/categories",
            data: "Use category example above"
          },
          {
            step: 5,
            action: "Create Product",
            endpoint: "POST /api/v1/products",
            data: "Use productCreate example above"
          },
          {
            step: 6,
            action: "Add to Cart",
            endpoint: "POST /api/v1/cart/items",
            data: "Use addToCart example above"
          },
          {
            step: 7,
            action: "Create Address",
            endpoint: "POST /api/v1/users/addresses",
            data: "Use address example above"
          },
          {
            step: 8,
            action: "Create Order",
            endpoint: "POST /api/v1/orders",
            data: "Use orderCreate example above"
          }
        ]
      }
    }
  });
});

module.exports = router;