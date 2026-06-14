const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/v1/testing/scenarios:
 *   get:
 *     summary: Get interactive testing scenarios
 *     tags: [Testing]
 *     description: Provides step-by-step testing scenarios for comprehensive API testing in Swagger UI
 *     responses:
 *       200:
 *         description: Interactive testing scenarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scenarios:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       steps:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             step:
 *                               type: integer
 *                             method:
 *                               type: string
 *                             endpoint:
 *                               type: string
 *                             description:
 *                               type: string
 *                             requestBody:
 *                               type: object
 *                             expectedStatus:
 *                               type: integer
 *                             notes:
 *                               type: string
 */
router.get('/scenarios', (req, res) => {
  res.json({
    success: true,
    message: 'Interactive testing scenarios for comprehensive API testing',
    data: {
      scenarios: [
        {
          name: 'Complete User Journey',
          description: 'Test the complete user journey from registration to order completion',
          estimatedTime: '10-15 minutes',
          steps: [
            {
              step: 1,
              method: 'POST',
              endpoint: '/api/v1/auth/register',
              description: 'Register a new user account',
              requestBody: {
                email: 'testuser@example.com',
                password: 'TestPass123!',
                name: 'Test User',
                phone: '+1234567890'
              },
              expectedStatus: 201,
              notes: 'Save the user ID from the response for later steps'
            },
            {
              step: 2,
              method: 'POST',
              endpoint: '/api/v1/auth/login',
              description: 'Login with the registered user',
              requestBody: {
                email: 'testuser@example.com',
                password: 'TestPass123!'
              },
              expectedStatus: 200,
              notes: 'Copy the token from response and use Authorize button: Bearer <token>'
            },
            {
              step: 3,
              method: 'POST',
              endpoint: '/api/v1/categories',
              description: 'Create a product category (requires admin role)',
              requestBody: {
                name: 'Test Electronics',
                description: 'Test category for electronics'
              },
              expectedStatus: 201,
              notes: 'Note the category ID for product creation'
            },
            {
              step: 4,
              method: 'POST',
              endpoint: '/api/v1/products',
              description: 'Create a new product',
              requestBody: {
                name: 'Test Headphones',
                description: 'High-quality test headphones',
                price: 9999,
                discountPrice: 7999,
                stock: 10,
                categoryId: 1,
                lowStockAlert: 5
              },
              expectedStatus: 201,
              notes: 'Save the product ID for cart operations'
            },
            {
              step: 5,
              method: 'POST',
              endpoint: '/api/v1/cart/items',
              description: 'Add product to cart',
              requestBody: {
                productId: 1,
                quantity: 2
              },
              expectedStatus: 201,
              notes: 'Verify cart total calculation'
            },
            {
              step: 6,
              method: 'GET',
              endpoint: '/api/v1/cart',
              description: 'View cart contents',
              expectedStatus: 200,
              notes: 'Check cart items and total amount'
            },
            {
              step: 7,
              method: 'POST',
              endpoint: '/api/v1/users/addresses',
              description: 'Add shipping address',
              requestBody: {
                firstName: 'Test',
                lastName: 'User',
                address1: '123 Test Street',
                city: 'Test City',
                state: 'TS',
                postalCode: '12345',
                country: 'US',
                phone: '+1234567890',
                isDefault: true
              },
              expectedStatus: 201,
              notes: 'Save address ID for order creation'
            },
            {
              step: 8,
              method: 'POST',
              endpoint: '/api/v1/orders',
              description: 'Create order from cart',
              requestBody: {
                addressId: 1
              },
              expectedStatus: 201,
              notes: 'Order should be created with PENDING status'
            },
            {
              step: 9,
              method: 'GET',
              endpoint: '/api/v1/orders',
              description: 'View order history',
              expectedStatus: 200,
              notes: 'Verify the created order appears in history'
            }
          ]
        },
        {
          name: 'Admin Operations',
          description: 'Test administrative functions and management operations',
          estimatedTime: '5-10 minutes',
          steps: [
            {
              step: 1,
              method: 'GET',
              endpoint: '/api/v1/admin/dashboard',
              description: 'View admin dashboard metrics',
              expectedStatus: 200,
              notes: 'Requires admin role - check user statistics'
            },
            {
              step: 2,
              method: 'GET',
              endpoint: '/api/v1/admin/orders',
              description: 'View all orders (admin)',
              expectedStatus: 200,
              notes: 'Should show orders from all users'
            },
            {
              step: 3,
              method: 'PUT',
              endpoint: '/api/v1/admin/orders/{orderId}/status',
              description: 'Update order status',
              requestBody: {
                status: 'PROCESSING',
                trackingCode: 'TEST123456'
              },
              expectedStatus: 200,
              notes: 'Replace {orderId} with actual order ID'
            },
            {
              step: 4,
              method: 'GET',
              endpoint: '/api/v1/admin/users',
              description: 'View all users',
              expectedStatus: 200,
              notes: 'Admin can view all registered users'
            },
            {
              step: 5,
              method: 'GET',
              endpoint: '/api/v1/admin/logs',
              description: 'View system logs',
              expectedStatus: 200,
              notes: 'Check API request logs and activities'
            }
          ]
        },
        {
          name: 'Product Management',
          description: 'Test product catalog and inventory management',
          estimatedTime: '5-8 minutes',
          steps: [
            {
              step: 1,
              method: 'GET',
              endpoint: '/api/v1/products',
              description: 'List all products',
              expectedStatus: 200,
              notes: 'Test pagination and filtering'
            },
            {
              step: 2,
              method: 'GET',
              endpoint: '/api/v1/products?search=headphones',
              description: 'Search products by name',
              expectedStatus: 200,
              notes: 'Test search functionality'
            },
            {
              step: 3,
              method: 'GET',
              endpoint: '/api/v1/products?category=1',
              description: 'Filter products by category',
              expectedStatus: 200,
              notes: 'Test category filtering'
            },
            {
              step: 4,
              method: 'PUT',
              endpoint: '/api/v1/products/{productId}',
              description: 'Update product information',
              requestBody: {
                name: 'Updated Headphones',
                price: 11999
              },
              expectedStatus: 200,
              notes: 'Replace {productId} with actual product ID'
            },
            {
              step: 5,
              method: 'PUT',
              endpoint: '/api/v1/inventory/{productId}',
              description: 'Update product inventory',
              requestBody: {
                stock: 25,
                lowStockAlert: 8
              },
              expectedStatus: 200,
              notes: 'Test inventory management'
            }
          ]
        },
        {
          name: 'Payment and Discounts',
          description: 'Test payment processing and discount system',
          estimatedTime: '5-8 minutes',
          steps: [
            {
              step: 1,
              method: 'POST',
              endpoint: '/api/v1/discounts',
              description: 'Create discount code',
              requestBody: {
                code: 'TEST20',
                type: 'PERCENTAGE',
                value: 20,
                minimumPurchase: 5000,
                maxUses: 10,
                expiresAt: '2025-12-31T23:59:59Z'
              },
              expectedStatus: 201,
              notes: 'Create a test discount code'
            },
            {
              step: 2,
              method: 'POST',
              endpoint: '/api/v1/discounts/validate',
              description: 'Validate discount code',
              requestBody: {
                code: 'TEST20',
                orderTotal: 10000
              },
              expectedStatus: 200,
              notes: 'Test discount validation logic'
            },
            {
              step: 3,
              method: 'POST',
              endpoint: '/api/v1/payments/initiate',
              description: 'Initiate payment process',
              requestBody: {
                orderId: 1,
                gateway: 'stripe',
                amount: 8000
              },
              expectedStatus: 200,
              notes: 'Test payment gateway integration'
            },
            {
              step: 4,
              method: 'GET',
              endpoint: '/api/v1/loyalty/points',
              description: 'Check loyalty points balance',
              expectedStatus: 200,
              notes: 'View current loyalty points'
            }
          ]
        },
        {
          name: 'Error Handling',
          description: 'Test error scenarios and validation',
          estimatedTime: '3-5 minutes',
          steps: [
            {
              step: 1,
              method: 'POST',
              endpoint: '/api/v1/auth/register',
              description: 'Test duplicate email registration',
              requestBody: {
                email: 'testuser@example.com',
                password: 'TestPass123!',
                name: 'Duplicate User'
              },
              expectedStatus: 400,
              notes: 'Should return validation error for duplicate email'
            },
            {
              step: 2,
              method: 'POST',
              endpoint: '/api/v1/auth/login',
              description: 'Test invalid credentials',
              requestBody: {
                email: 'testuser@example.com',
                password: 'WrongPassword'
              },
              expectedStatus: 401,
              notes: 'Should return authentication error'
            },
            {
              step: 3,
              method: 'GET',
              endpoint: '/api/v1/products/99999',
              description: 'Test non-existent product',
              expectedStatus: 404,
              notes: 'Should return not found error'
            },
            {
              step: 4,
              method: 'POST',
              endpoint: '/api/v1/cart/items',
              description: 'Test adding out-of-stock product',
              requestBody: {
                productId: 1,
                quantity: 1000
              },
              expectedStatus: 400,
              notes: 'Should return insufficient stock error'
            }
          ]
        }
      ],
      testingTips: [
        'Always start with user registration and login to get authentication token',
        'Use the Authorize button to set your Bearer token for protected endpoints',
        'Check response status codes - 2xx indicates success, 4xx client errors, 5xx server errors',
        'Review response bodies for detailed error messages and data structures',
        'Test both success and error scenarios to understand API behavior',
        'Use the browser console to see detailed request/response logs',
        'Save important IDs (user, product, order) from responses for subsequent requests'
      ],
      commonIssues: [
        {
          issue: 'Unauthorized (401) errors',
          solution: 'Make sure you have set the Bearer token in the Authorize section'
        },
        {
          issue: 'Validation (400) errors',
          solution: 'Check request body format and required fields in the schema'
        },
        {
          issue: 'Not Found (404) errors',
          solution: 'Verify the resource ID exists and the endpoint URL is correct'
        },
        {
          issue: 'Forbidden (403) errors',
          solution: 'Check if your user role has permission for this operation'
        }
      ]
    }
  });
});

/**
 * @swagger
 * /api/v1/testing/auth-demo:
 *   post:
 *     summary: Demo authentication flow
 *     tags: [Testing]
 *     description: Demonstrates the complete authentication flow for testing purposes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [register, login]
 *                 description: Authentication action to perform
 *           examples:
 *             register:
 *               summary: Register demo user
 *               value:
 *                 action: register
 *             login:
 *               summary: Login demo user
 *               value:
 *                 action: login
 *     responses:
 *       200:
 *         description: Authentication demo result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 action:
 *                   type: string
 *                 data:
 *                   type: object
 *                 instructions:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/auth-demo', async (req, res) => {
  const { action } = req.body;
  
  try {
    if (action === 'register') {
      // Simulate registration response
      res.json({
        success: true,
        action: 'register',
        data: {
          user: {
            id: 999,
            email: 'demo@example.com',
            name: 'Demo User',
            role: 'CUSTOMER'
          }
        },
        instructions: [
          'Demo user registered successfully',
          'Now use the login action to get authentication token',
          'Copy the token and use it in the Authorize button above'
        ]
      });
    } else if (action === 'login') {
      // Simulate login response with demo token
      const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjk5OSwiZW1haWwiOiJkZW1vQGV4YW1wbGUuY29tIiwicm9sZSI6IkNVU1RPTUVSIiwiaWF0IjoxNzMwNzI0MDAwLCJleHAiOjE3MzEzMjg4MDB9.demo_signature_for_testing';
      
      res.json({
        success: true,
        action: 'login',
        data: {
          token: demoToken,
          user: {
            id: 999,
            email: 'demo@example.com',
            name: 'Demo User',
            role: 'CUSTOMER'
          }
        },
        instructions: [
          'Demo login successful!',
          'Copy this token: Bearer ' + demoToken,
          'Click the Authorize button above',
          'Paste the token in the bearerAuth field',
          'Click Authorize and Close',
          'Now you can test protected endpoints'
        ]
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'Action must be either "register" or "login"'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DEMO_ERROR',
        message: 'Error in authentication demo',
        details: error.message
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/testing/guide:
 *   get:
 *     summary: Get comprehensive testing guide
 *     tags: [Testing]
 *     description: Provides a complete guide for testing the API using Swagger UI interactive features
 *     responses:
 *       200:
 *         description: Comprehensive testing guide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 guide:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     sections:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/guide', (req, res) => {
  res.json({
    success: true,
    message: 'Comprehensive API testing guide',
    data: {
      guide: {
        title: 'E-commerce Platform API Testing Guide',
        version: '1.0.0',
        lastUpdated: '2025-11-04',
        sections: [
          {
            title: 'Getting Started',
            content: [
              'Welcome to the E-commerce Platform API interactive testing environment!',
              'This Swagger UI interface allows you to test all API endpoints directly from your browser.',
              'Follow this guide to make the most of the testing capabilities.'
            ],
            steps: [
              'Scroll down to explore all available endpoints organized by category',
              'Click on any endpoint to expand its documentation and testing interface',
              'Use the "Try it out" button to enable interactive testing',
              'Fill in parameters and request body, then click "Execute"'
            ]
          },
          {
            title: 'Authentication Setup',
            content: [
              'Most endpoints require authentication using JWT tokens.',
              'Follow these steps to authenticate and test protected endpoints:'
            ],
            steps: [
              'First, register a new user account using POST /api/v1/auth/register',
              'Then login using POST /api/v1/auth/login to get your JWT token',
              'Copy the token from the login response (without "Bearer" prefix)',
              'Click the green "Authorize" button at the top of this page',
              'In the bearerAuth field, enter: Bearer YOUR_TOKEN_HERE',
              'Click "Authorize" then "Close"',
              'You are now authenticated and can test protected endpoints!'
            ]
          },
          {
            title: 'Interactive Features',
            content: [
              'This API documentation includes several interactive features to enhance your testing experience:'
            ],
            features: [
              {
                name: 'Persistent Authorization',
                description: 'Your authentication token is saved across browser sessions'
              },
              {
                name: 'Request/Response Logging',
                description: 'All requests and responses are logged to the browser console for debugging'
              },
              {
                name: 'Example Data',
                description: 'Pre-filled example data for all request bodies and parameters'
              },
              {
                name: 'Status Indicators',
                description: 'Visual indicators show success (green) and error (red) responses'
              },
              {
                name: 'Keyboard Shortcuts',
                description: 'Use Ctrl/Cmd + Enter to quickly execute requests'
              },
              {
                name: 'Testing Scenarios',
                description: 'Pre-built testing scenarios available at /api/v1/testing/scenarios'
              }
            ]
          },
          {
            title: 'Testing Best Practices',
            content: [
              'Follow these best practices for effective API testing:'
            ],
            practices: [
              'Always test both success and error scenarios',
              'Check response status codes and error messages',
              'Verify response data structure matches the schema',
              'Test edge cases like invalid IDs, missing parameters, etc.',
              'Use realistic test data that matches production scenarios',
              'Test the complete user journey from registration to order completion',
              'Verify authentication and authorization work correctly',
              'Test rate limiting by making multiple rapid requests'
            ]
          },
          {
            title: 'Common Testing Workflows',
            content: [
              'Here are some common testing workflows to get you started:'
            ],
            workflows: [
              {
                name: 'User Registration & Authentication',
                steps: [
                  'POST /api/v1/auth/register - Register new user',
                  'POST /api/v1/auth/login - Login and get token',
                  'Use Authorize button to set token',
                  'GET /api/v1/users/profile - Test authenticated endpoint'
                ]
              },
              {
                name: 'Product Management',
                steps: [
                  'POST /api/v1/categories - Create category',
                  'POST /api/v1/products - Create product',
                  'GET /api/v1/products - List products',
                  'PUT /api/v1/products/{id} - Update product'
                ]
              },
              {
                name: 'Shopping & Orders',
                steps: [
                  'POST /api/v1/cart/items - Add product to cart',
                  'GET /api/v1/cart - View cart contents',
                  'POST /api/v1/users/addresses - Add shipping address',
                  'POST /api/v1/orders - Create order from cart'
                ]
              }
            ]
          },
          {
            title: 'Troubleshooting',
            content: [
              'Common issues and their solutions:'
            ],
            troubleshooting: [
              {
                issue: '401 Unauthorized Error',
                causes: [
                  'Missing or invalid authentication token',
                  'Token has expired',
                  'Token not properly formatted'
                ],
                solutions: [
                  'Make sure you have clicked the Authorize button',
                  'Verify token format: Bearer YOUR_TOKEN',
                  'Login again to get a fresh token'
                ]
              },
              {
                issue: '400 Validation Error',
                causes: [
                  'Missing required fields',
                  'Invalid data format',
                  'Data doesn\'t meet validation rules'
                ],
                solutions: [
                  'Check the request schema for required fields',
                  'Verify data types match the schema',
                  'Review validation error details in response'
                ]
              },
              {
                issue: '404 Not Found Error',
                causes: [
                  'Resource doesn\'t exist',
                  'Incorrect endpoint URL',
                  'Invalid resource ID'
                ],
                solutions: [
                  'Verify the resource ID exists',
                  'Check the endpoint URL spelling',
                  'Create the resource first if needed'
                ]
              }
            ]
          },
          {
            title: 'Advanced Testing',
            content: [
              'Advanced testing techniques for comprehensive API validation:'
            ],
            advanced: [
              {
                technique: 'Load Testing',
                description: 'Test API performance under load',
                steps: [
                  'Use browser developer tools to monitor network requests',
                  'Make multiple concurrent requests to test rate limiting',
                  'Monitor response times for performance issues'
                ]
              },
              {
                technique: 'Security Testing',
                description: 'Test API security measures',
                steps: [
                  'Try accessing protected endpoints without authentication',
                  'Test with invalid or malformed tokens',
                  'Attempt SQL injection in input fields',
                  'Test with extremely large request bodies'
                ]
              },
              {
                technique: 'Data Validation Testing',
                description: 'Verify data validation rules',
                steps: [
                  'Test with missing required fields',
                  'Use invalid data types (string where number expected)',
                  'Test field length limits',
                  'Try special characters and Unicode'
                ]
              }
            ]
          }
        ],
        quickStart: {
          title: 'Quick Start (5 minutes)',
          steps: [
            '1. Click POST /api/v1/auth/register below',
            '2. Click "Try it out" and use the example data',
            '3. Click "Execute" to register',
            '4. Click POST /api/v1/auth/login',
            '5. Use the same email/password and execute',
            '6. Copy the token from the response',
            '7. Click the green "Authorize" button at the top',
            '8. Enter "Bearer YOUR_TOKEN" and click Authorize',
            '9. Now test any protected endpoint!'
          ]
        },
        resources: {
          documentation: '/api-docs',
          testData: '/api/v1/test-data',
          scenarios: '/api/v1/testing/scenarios',
          authDemo: '/api/v1/testing/auth-demo',
          apiRoot: '/api/v1'
        }
      }
    }
  });
});
module.
exports = router;