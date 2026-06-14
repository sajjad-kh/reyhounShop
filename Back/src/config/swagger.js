const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Basic Swagger configuration
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce Platform API',
      version: '1.0.0',
      description: 'Complete e-commerce platform with comprehensive product management, order processing, payment integration, and user management',
      contact: {
        name: 'API Support',
        email: 'support@ecommerce-platform.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.ecommerce-platform.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication. Get token from login endpoint and use format: Bearer <token>',
          example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service authentication'
        }
      },
      examples: {
        UserRegistrationExample: {
          summary: 'Complete user registration',
          description: 'Example of a complete user registration with all fields',
          value: {
            email: 'john.doe@example.com',
            password: 'SecurePass123!',
            name: 'John Doe',
            phone: '+1234567890',
            birthDate: '1990-01-15'
          }
        },
        UserLoginExample: {
          summary: 'User login credentials',
          description: 'Example login credentials for testing',
          value: {
            email: 'john.doe@example.com',
            password: 'SecurePass123!'
          }
        },
        ProductCreateExample: {
          summary: 'Create new product',
          description: 'Example product creation with all required fields',
          value: {
            name: 'Wireless Bluetooth Headphones',
            description: 'Premium wireless headphones with active noise cancellation, 30-hour battery life, and superior sound quality.',
            price: 15999,
            discountPrice: 12999,
            stock: 50,
            categoryId: 1,
            lowStockAlert: 10
          }
        },
        OrderCreateExample: {
          summary: 'Create new order',
          description: 'Example order creation from cart items',
          value: {
            addressId: 1,
            discountCode: 'SAVE10'
          }
        },
        AddToCartExample: {
          summary: 'Add product to cart',
          description: 'Example of adding a product to shopping cart',
          value: {
            productId: 1,
            quantity: 2
          }
        },
        DiscountCodeExample: {
          summary: 'Create discount code',
          description: 'Example discount code with percentage discount',
          value: {
            code: 'WELCOME20',
            type: 'PERCENTAGE',
            value: 20,
            minimumPurchase: 5000,
            maxUses: 100,
            expiresAt: '2025-12-31T23:59:59Z'
          }
        },
        CategoryExample: {
          summary: 'Create product category',
          description: 'Example category creation',
          value: {
            name: 'Electronics',
            description: 'Electronic devices and accessories',
            parentId: null
          }
        },
        AddressExample: {
          summary: 'User address',
          description: 'Example user address for shipping',
          value: {
            firstName: 'John',
            lastName: 'Doe',
            company: 'Tech Solutions Inc.',
            address1: '123 Main Street',
            address2: 'Suite 456',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'US',
            phone: '+1234567890',
            isDefault: true
          }
        },
        ReviewExample: {
          summary: 'Product review',
          description: 'Example product review with rating and comment',
          value: {
            rating: 5,
            comment: 'Excellent product! The sound quality is amazing and the battery life exceeds expectations. Highly recommended!'
          }
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code identifier'
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message'
                },
                details: {
                  type: 'object',
                  description: 'Additional error details'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Error timestamp'
                },
                requestId: {
                  type: 'string',
                  description: 'Unique request identifier for tracking'
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            role: {
              type: 'string',
              enum: ['CUSTOMER', 'ADMIN'],
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              description: 'User account status'
            },
            twoFactorEnabled: {
              type: 'boolean',
              description: '2FA status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Product ID'
            },
            name: {
              type: 'string',
              description: 'Product name'
            },
            description: {
              type: 'string',
              description: 'Product description'
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Product price'
            },
            discountPrice: {
              type: 'number',
              format: 'decimal',
              description: 'Discounted price'
            },
            categoryId: {
              type: 'integer',
              description: 'Category ID'
            },
            isActive: {
              type: 'boolean',
              description: 'Product availability status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Order ID'
            },
            userId: {
              type: 'integer',
              description: 'User ID'
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'DELAYED'],
              description: 'Order status'
            },
            totalAmount: {
              type: 'number',
              format: 'decimal',
              description: 'Total order amount'
            },
            trackingCode: {
              type: 'string',
              description: 'Order tracking code'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication token is required',
                  timestamp: '2025-11-04T10:30:00Z',
                  requestId: 'req_abc123'
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions to access this resource',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                  timestamp: '2025-11-04T10:30:00Z',
                  requestId: 'req_abc123'
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Request validation failed',
                  details: {
                    field: 'email',
                    message: 'Invalid email format'
                  },
                  timestamp: '2025-11-04T10:30:00Z',
                  requestId: 'req_abc123'
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                  timestamp: '2025-11-04T10:30:00Z',
                  requestId: 'req_abc123'
                }
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'An unexpected error occurred',
                  timestamp: '2025-11-04T10:30:00Z',
                  requestId: 'req_abc123'
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User profile and account management'
      },
      {
        name: 'Products',
        description: 'Product catalog and management'
      },
      {
        name: 'Categories',
        description: 'Product category management'
      },
      {
        name: 'Cart',
        description: 'Shopping cart operations'
      },
      {
        name: 'Orders',
        description: 'Order management and tracking'
      },
      {
        name: 'Payments',
        description: 'Payment processing and gateway integration'
      },
      {
        name: 'Discounts',
        description: 'Discount code management'
      },
      {
        name: 'Loyalty',
        description: 'Loyalty points system'
      },
      {
        name: 'Wishlist',
        description: 'User wishlist management'
      },
      {
        name: 'Admin',
        description: 'Administrative functions and reporting'
      },
      {
        name: 'Inventory',
        description: 'Inventory and stock management'
      },
      {
        name: 'Testing',
        description: 'Testing utilities and example data'
      }
    ],
    externalDocs: {
      description: 'Find out more about the E-commerce Platform',
      url: 'https://github.com/your-repo/ecommerce-platform'
    },
    // Security definitions with examples
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/api/v1/*.js',
    './src/api/v1/**/*.js',
    './src/api/v2/*.js',
    './src/api/v2/**/*.js'
  ]
};

// Generate Swagger specification
const specs = swaggerJsdoc(options);

// Swagger UI options with enhanced interactive testing
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
    tryItOutEnabled: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    validatorUrl: null, // Disable validator for better testing experience
    oauth2RedirectUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api-docs/oauth2-redirect.html`,
    requestInterceptor: (request) => {
      // Add request ID for tracking
      request.headers['X-Request-ID'] = 'swagger-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Add content-type for JSON requests if not present
      if (request.body && typeof request.body === 'object' && !request.headers['Content-Type']) {
        request.headers['Content-Type'] = 'application/json';
      }
      
      // Log request for debugging
      console.log('Swagger API Request:', {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body
      });
      
      return request;
    },
    responseInterceptor: (response) => {
      // Log response for debugging
      console.log('Swagger API Response:', {
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body
      });
      
      // Show success/error styling based on status
      setTimeout(() => {
        const responseElements = document.querySelectorAll('.response');
        responseElements.forEach(el => {
          const statusElement = el.querySelector('.response-col_status');
          if (statusElement) {
            const status = parseInt(statusElement.textContent);
            if (status >= 200 && status < 300) {
              el.classList.add('success');
              el.classList.remove('error');
            } else if (status >= 400) {
              el.classList.add('error');
              el.classList.remove('success');
            }
          }
        });
      }, 100);
      
      return response;
    },
    // Enhanced initialization for better testing experience
    onComplete: () => {
      const ui = window.ui;
      if (ui) {
        // Enhance authorization button styling
        setTimeout(() => {
          const authButton = document.querySelector('.btn.authorize');
          if (authButton) {
            authButton.style.backgroundColor = '#49cc90';
            authButton.style.borderColor = '#49cc90';
            authButton.title = 'Click to add authentication token for testing protected endpoints';
          }
          
          // Add helpful tooltips and guidance
          addTestingGuidance();
          
          // Auto-expand authentication section
          const authSection = document.querySelector('.auth-wrapper');
          if (authSection) {
            authSection.style.display = 'block';
          }
        }, 1000);
        
        // Add keyboard shortcuts for better testing experience
        document.addEventListener('keydown', (e) => {
          // Ctrl/Cmd + Enter to execute request
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const executeButton = document.querySelector('.execute-wrapper .btn');
            if (executeButton && !executeButton.disabled) {
              executeButton.click();
            }
          }
        });
      }
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { 
      background: #f7f7f7; 
      padding: 15px; 
      border-radius: 4px; 
      margin: 20px 0;
      border-left: 4px solid #49cc90;
    }
    .swagger-ui .auth-wrapper {
      background: #e8f5e8;
      padding: 15px;
      border-radius: 4px;
      margin: 10px 0;
      border: 2px solid #49cc90;
    }
    .swagger-ui .btn.authorize {
      background-color: #49cc90;
      border-color: #49cc90;
      color: white;
      font-weight: bold;
      font-size: 14px;
      padding: 8px 16px;
      animation: pulse 2s infinite;
    }
    .swagger-ui .btn.authorize:hover {
      background-color: #3ea876;
      border-color: #3ea876;
      animation: none;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(73, 204, 144, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(73, 204, 144, 0); }
      100% { box-shadow: 0 0 0 0 rgba(73, 204, 144, 0); }
    }
    .swagger-ui .response-col_status {
      font-weight: bold;
      font-size: 16px;
    }
    .swagger-ui .response.success .response-col_status {
      color: #49cc90;
    }
    .swagger-ui .response.error .response-col_status {
      color: #f93e3e;
    }
    .swagger-ui .response.success {
      border-left: 4px solid #49cc90;
      background-color: #f0fff4;
    }
    .swagger-ui .response.error {
      border-left: 4px solid #f93e3e;
      background-color: #fff5f5;
    }
    .swagger-ui .try-out__btn {
      background: #61affe;
      color: white;
      border-color: #61affe;
      font-weight: bold;
    }
    .swagger-ui .try-out__btn:hover {
      background: #4e90d9;
      border-color: #4e90d9;
    }
    .swagger-ui .execute-wrapper .btn {
      background: #4990e2;
      color: white;
      border-color: #4990e2;
      font-weight: bold;
      font-size: 14px;
      padding: 10px 20px;
    }
    .swagger-ui .execute-wrapper .btn:hover {
      background: #357abd;
      border-color: #357abd;
    }
    .swagger-ui .parameters-col_description p {
      margin: 0;
      color: #3b4151;
    }
    .swagger-ui .model-example {
      background: #f7f7f7;
      border: 1px solid #d3d3d3;
    }
    .swagger-ui .parameter__name {
      font-weight: bold;
      color: #3b4151;
    }
    .swagger-ui .parameter__type {
      color: #999;
      font-size: 12px;
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #49cc90;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary {
      border-color: #49cc90;
    }
    .swagger-ui .opblock.opblock-get {
      border-color: #61affe;
    }
    .swagger-ui .opblock.opblock-put {
      border-color: #fca130;
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: #f93e3e;
    }
    .testing-guidance {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .testing-guidance h3 {
      margin-top: 0;
      color: white;
    }
    .testing-guidance ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    .testing-guidance li {
      margin: 8px 0;
      line-height: 1.5;
    }
    .testing-guidance .highlight {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
    }
    .auth-status {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 15px;
      border-radius: 5px;
      font-weight: bold;
      z-index: 1000;
      transition: all 0.3s ease;
    }
    .auth-status.authenticated {
      background: #49cc90;
      color: white;
    }
    .auth-status.not-authenticated {
      background: #f93e3e;
      color: white;
    }
  `,
  customSiteTitle: 'E-commerce Platform API Documentation',
  customfavIcon: '/favicon.ico'
};

// Helper function to add testing guidance and interactive features
function addTestingGuidance() {
  // Add testing guidance panel
  const infoSection = document.querySelector('.swagger-ui .info');
  if (infoSection && !document.querySelector('.testing-guidance')) {
    const guidanceHTML = `
      <div class="testing-guidance">
        <h3>🚀 Interactive API Testing Guide</h3>
        <p>Follow these steps to test the API endpoints:</p>
        <ol>
          <li><strong>Get Test Data:</strong> Visit <span class="highlight">GET /api/v1/test-data</span> to see example request bodies</li>
          <li><strong>Register:</strong> Use <span class="highlight">POST /api/v1/auth/register</span> with example data</li>
          <li><strong>Login:</strong> Use <span class="highlight">POST /api/v1/auth/login</span> to get your JWT token</li>
          <li><strong>Authorize:</strong> Click the <span class="highlight">🔒 Authorize</span> button above and enter: <code>Bearer YOUR_TOKEN</code></li>
          <li><strong>Test Protected Endpoints:</strong> Now you can test any endpoint that requires authentication</li>
        </ol>
        <p><strong>💡 Pro Tips:</strong></p>
        <ul>
          <li>Use <kbd>Ctrl/Cmd + Enter</kbd> to execute requests quickly</li>
          <li>Check the browser console for detailed request/response logs</li>
          <li>The authorization persists across browser sessions</li>
          <li>Red responses indicate errors, green indicates success</li>
        </ul>
      </div>
    `;
    infoSection.insertAdjacentHTML('afterend', guidanceHTML);
  }
  
  // Add authentication status indicator
  if (!document.querySelector('.auth-status')) {
    const authStatus = document.createElement('div');
    authStatus.className = 'auth-status not-authenticated';
    authStatus.textContent = '🔒 Not Authenticated';
    authStatus.title = 'Click Authorize button to authenticate';
    document.body.appendChild(authStatus);
    
    // Monitor authentication status
    const checkAuthStatus = () => {
      const authButton = document.querySelector('.btn.authorize');
      const isAuthenticated = authButton && authButton.querySelector('.locked');
      
      if (isAuthenticated) {
        authStatus.className = 'auth-status authenticated';
        authStatus.textContent = '✅ Authenticated';
        authStatus.title = 'You are authenticated and can test protected endpoints';
      } else {
        authStatus.className = 'auth-status not-authenticated';
        authStatus.textContent = '🔒 Not Authenticated';
        authStatus.title = 'Click Authorize button to authenticate';
      }
    };
    
    // Check auth status periodically
    setInterval(checkAuthStatus, 2000);
    
    // Check immediately
    setTimeout(checkAuthStatus, 1000);
  }
  
  // Enhance parameter inputs with better UX
  setTimeout(() => {
    // Add placeholder text to common parameters
    const inputs = document.querySelectorAll('input[placeholder=""]');
    inputs.forEach(input => {
      const paramName = input.closest('tr')?.querySelector('.parameter__name')?.textContent?.toLowerCase();
      if (paramName) {
        switch (paramName) {
          case 'email':
            input.placeholder = 'test@example.com';
            break;
          case 'password':
            input.placeholder = 'TestPass123!';
            break;
          case 'name':
            input.placeholder = 'John Doe';
            break;
          case 'phone':
            input.placeholder = '+1234567890';
            break;
          case 'quantity':
            input.placeholder = '1';
            break;
          case 'productid':
            input.placeholder = '1';
            break;
          case 'categoryid':
            input.placeholder = '1';
            break;
        }
      }
    });
    
    // Add copy buttons for example responses
    const responseElements = document.querySelectorAll('.response-col_description');
    responseElements.forEach(el => {
      if (el.textContent.includes('token') && !el.querySelector('.copy-token-btn')) {
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copy Token';
        copyBtn.className = 'btn copy-token-btn';
        copyBtn.style.cssText = 'margin-left: 10px; padding: 4px 8px; font-size: 12px; background: #49cc90; color: white; border: none; border-radius: 3px; cursor: pointer;';
        copyBtn.onclick = () => {
          const tokenMatch = el.textContent.match(/"token":\s*"([^"]+)"/);
          if (tokenMatch) {
            navigator.clipboard.writeText(`Bearer ${tokenMatch[1]}`);
            copyBtn.textContent = '✅ Copied!';
            setTimeout(() => {
              copyBtn.textContent = '📋 Copy Token';
            }, 2000);
          }
        };
        el.appendChild(copyBtn);
      }
    });
  }, 2000);
}

// Make the function available globally for the Swagger UI
if (typeof window !== 'undefined') {
  window.addTestingGuidance = addTestingGuidance;
}

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};