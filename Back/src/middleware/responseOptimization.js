/**
 * Response Optimization Middleware
 * Implements compression, caching, and response time optimization
 */

const compression = require('compression');
const { queryOptimizer } = require('../utils/queryOptimizer');

/**
 * Response compression middleware
 */
const responseCompression = compression({
  // Compress responses larger than 1KB
  threshold: 1024,
  
  // Compression level (1-9, 6 is default)
  level: 6,
  
  // Only compress these content types
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use compression filter
    return compression.filter(req, res);
  },
  
  // Compression options
  chunkSize: 1024,
  windowBits: 15,
  memLevel: 8
});

/**
 * Cache headers middleware for different content types
 */
const cacheHeaders = (req, res, next) => {
  const path = req.path;
  const method = req.method;
  
  // Only apply caching to GET requests
  if (method !== 'GET') {
    return next();
  }
  
  // Static assets - long cache
  if (path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
      'Expires': new Date(Date.now() + 31536000000).toUTCString()
    });
  }
  // API responses - short cache for semi-static data
  else if (path.startsWith('/api/v1/products') && !path.includes('/admin/')) {
    res.set({
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60', // 5 minutes
      'Vary': 'Accept-Encoding, Authorization'
    });
  }
  // Categories - medium cache
  else if (path.startsWith('/api/v1/categories')) {
    res.set({
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=300', // 30 minutes
      'Vary': 'Accept-Encoding'
    });
  }
  // User-specific data - no cache
  else if (path.includes('/cart') || path.includes('/orders') || path.includes('/profile')) {
    res.set({
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
  // Admin endpoints - no cache
  else if (path.includes('/admin/')) {
    res.set({
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
  // Default - short cache
  else {
    res.set({
      'Cache-Control': 'public, max-age=60', // 1 minute
      'Vary': 'Accept-Encoding'
    });
  }
  
  next();
};

/**
 * Response time monitoring middleware
 */
const responseTimeMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.json to capture response time
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Add response time header
    res.set('X-Response-Time', `${responseTime}ms`);
    
    // Log slow responses
    if (responseTime > 1000) {
      console.warn(`🐌 Slow response: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    // Store response time for monitoring
    req.responseTime = responseTime;
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Pagination optimization middleware
 */
const paginationOptimizer = (req, res, next) => {
  // Standardize pagination parameters
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  
  // Add pagination to request
  req.pagination = {
    page,
    limit,
    offset,
    skip: offset
  };
  
  // Override res.json to add pagination metadata
  const originalJson = res.json;
  res.json = function(data) {
    // If data has pagination info, format it consistently
    if (data && typeof data === 'object' && data.pagination) {
      const formattedData = {
        data: data.data || data.items || data.results,
        pagination: {
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          pages: data.pagination.pages,
          hasNext: data.pagination.page < data.pagination.pages,
          hasPrev: data.pagination.page > 1
        }
      };
      return originalJson.call(this, formattedData);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Data serialization optimization
 */
// const dataSerializer = (req, res, next) => {
//   const originalJson = res.json;
  
//   res.json = function(data) {
//     // Remove null values and optimize data structure
//     const optimizedData = optimizeDataStructure(data);
    
//     // Add metadata
//     const responseData = {
//       ...optimizedData,
//       meta: {
//         timestamp: new Date().toISOString(),
//         version: req.apiVersion || 'v1',
//         ...(req.responseTime && { responseTime: `${req.responseTime}ms` })
//       }
//     };
    
//     return originalJson.call(this, responseData);
//   };
  
//   next();
// };


const dataSerializer = (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    const responseData = {
      ...data,
      meta: {
        timestamp: new Date().toISOString(),
        version: req.apiVersion || 'v1',
        ...(req.responseTime && { responseTime: `${req.responseTime}ms` })
      }
    };

    return originalJson.call(this, responseData);
  };

  next();
};


/**
 * Optimize data structure by removing nulls and empty objects
 */
function optimizeDataStructure(data) {

console.log(
  "OPTIMIZE REVIEW",
  JSON.stringify(
    data?.data?.reviews?.[0] || data?.testReview,
    null,
    2
  )
);
  if (data === null || data === undefined) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(optimizeDataStructure).filter(item => item !== null);
  }
  
  if (typeof data === 'object') {
    const optimized = {};
    
    for (const [key, value] of Object.entries(data)) {
      const optimizedValue = optimizeDataStructure(value);
      
      // Skip null values and empty objects/arrays
      if (optimizedValue !== null && 
          optimizedValue !== undefined && 
          !(Array.isArray(optimizedValue) && optimizedValue.length === 0) &&
          !(typeof optimizedValue === 'object' && Object.keys(optimizedValue).length === 0)) {
        optimized[key] = optimizedValue;
      }
    }
    
    return optimized;
  }
  
  return data;
}

/**
 * Response optimization for specific endpoints
 */
const endpointOptimizer = (req, res, next) => {
  const path = req.path;
  
  // Product listing optimization
  if (path === '/api/v1/products' && req.method === 'GET') {
    // Use optimized query
    req.useOptimizedQuery = true;
    req.optimizedQueryType = 'productSearch';
  }
  
  // User orders optimization
  if (path === '/api/v1/orders' && req.method === 'GET') {
    req.useOptimizedQuery = true;
    req.optimizedQueryType = 'userOrders';
  }
  
  // Dashboard optimization
  if (path === '/api/v1/admin/dashboard' && req.method === 'GET') {
    req.useOptimizedQuery = true;
    req.optimizedQueryType = 'dashboardStats';
  }
  
  next();
};

/**
 * ETag generation for cacheable responses
 */
const etagGenerator = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Generate ETag for cacheable responses
    if (res.get('Cache-Control') && !res.get('Cache-Control').includes('no-cache')) {
      const etag = generateETag(data);
      res.set('ETag', etag);
      
      // Check if client has cached version
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Generate ETag from data
 */
function generateETag(data) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}

/**
 * Content negotiation middleware
 */
const contentNegotiation = (req, res, next) => {
  const acceptHeader = req.headers.accept || 'application/json';
  
  // Set response format based on Accept header
  if (acceptHeader.includes('application/xml')) {
    req.responseFormat = 'xml';
  } else if (acceptHeader.includes('text/csv')) {
    req.responseFormat = 'csv';
  } else {
    req.responseFormat = 'json';
  }
  
  next();
};

module.exports = {
  responseCompression,
  cacheHeaders,
  responseTimeMonitor,
  paginationOptimizer,
  dataSerializer,
  endpointOptimizer,
  etagGenerator,
  contentNegotiation,
  optimizeDataStructure
};