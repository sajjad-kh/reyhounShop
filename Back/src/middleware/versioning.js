/**
 * API Versioning Middleware
 * Handles version-specific configurations and backward compatibility
 */

/**
 * Version detection middleware
 * Extracts API version from URL path and sets it in request context
 */
const detectVersion = (req, res, next) => {
  // Extract version from URL path (e.g., /api/v1/users -> v1)
  const versionMatch = req.path.match(/^\/api\/(v\d+)/);
  
  if (versionMatch) {
    req.apiVersion = versionMatch[1];
  } else {
    // Default to v1 if no version specified
    req.apiVersion = 'v1';
  }
  
  // Add version info to response headers
  res.set('API-Version', req.apiVersion);
  res.set('API-Supported-Versions', 'v1, v2');
  
  next();
};

/**
 * Version-specific configuration middleware
 * Applies different configurations based on API version
 */
const versionConfig = (req, res, next) => {
  const version = req.apiVersion;
  
  // Version-specific configurations
  const configs = {
    v1: {
      maxPageSize: 50,
      defaultPageSize: 20,
      rateLimitMultiplier: 1,
      features: {
        advancedSearch: false,
        realTimeNotifications: false,
        graphql: false
      }
    },
    v2: {
      maxPageSize: 100,
      defaultPageSize: 25,
      rateLimitMultiplier: 1.5, // Higher rate limits for v2
      features: {
        advancedSearch: true,
        realTimeNotifications: true,
        graphql: true
      }
    }
  };
  
  // Set version-specific config in request
  req.versionConfig = configs[version] || configs.v1;
  
  next();
};

/**
 * Backward compatibility middleware
 * Handles deprecated fields and transforms requests/responses for compatibility
 */
const backwardCompatibility = (req, res, next) => {
  const version = req.apiVersion;
  
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to apply version-specific transformations
  res.json = function(data) {
    let transformedData = data;
    
    if (version === 'v1') {
      // Apply v1 compatibility transformations
      transformedData = applyV1Compatibility(data);
    }
    
    // Add version metadata to response
    if (transformedData && typeof transformedData === 'object' && !Array.isArray(transformedData)) {
      transformedData._meta = {
        version: version,
        timestamp: new Date().toISOString(),
        ...(transformedData._meta || {})
      };
    }
    
    return originalJson.call(this, transformedData);
  };
  
  next();
};

/**
 * Apply v1 compatibility transformations
 * Ensures v1 responses maintain expected format
 */
const applyV1Compatibility = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Handle array responses (e.g., product lists)
  if (Array.isArray(data)) {
    return data.map(item => applyV1ItemCompatibility(item));
  }
  
  // Handle paginated responses
  if (data.data && Array.isArray(data.data)) {
    return {
      ...data,
      data: data.data.map(item => applyV1ItemCompatibility(item))
    };
  }
  
  // Handle single item responses
  return applyV1ItemCompatibility(data);
};

/**
 * Apply v1 compatibility to individual items
 */
const applyV1ItemCompatibility = (item) => {
  if (!item || typeof item !== 'object') {
    return item;
  }
  
  const compatibleItem = { ...item };
  
  // Example compatibility transformations:
  // - Rename new fields to old field names
  // - Remove new fields that didn't exist in v1
  // - Transform data formats
  
  // Remove v2-specific fields from v1 responses
  const v2OnlyFields = ['aiRecommendations', 'realTimeStock', 'advancedMetrics'];
  v2OnlyFields.forEach(field => {
    delete compatibleItem[field];
  });
  
  return compatibleItem;
};

/**
 * Version deprecation warning middleware
 * Adds deprecation warnings for older API versions
 */
const deprecationWarning = (req, res, next) => {
  const version = req.apiVersion;
  
  // Add deprecation warnings for older versions
  if (version === 'v1') {
    res.set('Deprecation', 'true');
    res.set('Sunset', '2026-12-31'); // v1 sunset date
    res.set('Link', '</api/v2>; rel="successor-version"');
    res.set('Warning', '299 - "API v1 is deprecated. Please migrate to v2. Support ends December 31, 2026."');
  }
  
  next();
};

/**
 * Version validation middleware
 * Validates that the requested API version is supported
 */
const validateVersion = (req, res, next) => {
  const version = req.apiVersion;
  const supportedVersions = ['v1', 'v2'];
  
  if (!supportedVersions.includes(version)) {
    return res.status(400).json({
      error: {
        code: 'UNSUPPORTED_API_VERSION',
        message: `API version '${version}' is not supported`,
        supportedVersions: supportedVersions,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next();
};

module.exports = {
  detectVersion,
  versionConfig,
  backwardCompatibility,
  deprecationWarning,
  validateVersion
};