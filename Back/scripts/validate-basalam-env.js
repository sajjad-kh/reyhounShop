#!/usr/bin/env node

/**
 * Basalam Environment Variables Validation Script
 * 
 * This script validates that all required Basalam environment variables
 * are properly configured before starting the application.
 */

const requiredVars = [
  'BASALAM_API_URL',
  'BASALAM_ORDER_API_URL',
  'BASALAM_API_TOKEN',
  'BASALAM_CALLBACK_URL'
];

const optionalVars = [
  'BASALAM_API_TIMEOUT',
  'BASALAM_API_RETRY_ATTEMPTS',
  'BASALAM_API_RETRY_DELAY',
  'BASALAM_ORDER_SYNC_INTERVAL',
  'BASALAM_ORDER_CACHE_TTL'
];

const defaultValues = {
  BASALAM_API_TIMEOUT: '30000',
  BASALAM_API_RETRY_ATTEMPTS: '3',
  BASALAM_API_RETRY_DELAY: '1000',
  BASALAM_ORDER_SYNC_INTERVAL: '30000',
  BASALAM_ORDER_CACHE_TTL: '120'
};

console.log('🔍 Validating Basalam environment variables...\n');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`  ❌ ${varName}: NOT SET`);
    hasErrors = true;
  } else if (value.includes('your_') || value.includes('change_this')) {
    console.log(`  ⚠️  ${varName}: SET (but appears to be a placeholder)`);
    hasWarnings = true;
  } else {
    // Mask sensitive values
    const displayValue = varName.includes('TOKEN') 
      ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
      : value;
    console.log(`  ✅ ${varName}: ${displayValue}`);
  }
});

// Check optional variables
console.log('\n📋 Optional Variables (with defaults):');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const defaultValue = defaultValues[varName];
  if (!value || value.trim() === '') {
    console.log(`  ℹ️  ${varName}: NOT SET (will use default: ${defaultValue})`);
  } else {
    console.log(`  ✅ ${varName}: ${value}`);
  }
});

// Validate URL formats
console.log('\n🔗 URL Validation:');
const urlVars = ['BASALAM_API_URL', 'BASALAM_ORDER_API_URL', 'BASALAM_CALLBACK_URL'];
urlVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    try {
      new URL(value);
      console.log(`  ✅ ${varName}: Valid URL format`);
    } catch (error) {
      console.log(`  ❌ ${varName}: Invalid URL format`);
      hasErrors = true;
    }
  }
});

// Validate token format (JWT)
console.log('\n🔐 Token Validation:');
const token = process.env.BASALAM_API_TOKEN;
if (token) {
  const parts = token.split('.');
  if (parts.length === 3) {
    console.log('  ✅ BASALAM_API_TOKEN: Valid JWT format');
    
    // Try to decode the payload (without verification)
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (payload.exp) {
        const expiryDate = new Date(payload.exp * 1000);
        const now = new Date();
        if (expiryDate < now) {
          console.log(`  ⚠️  Token expired on: ${expiryDate.toISOString()}`);
          hasWarnings = true;
        } else {
          console.log(`  ✅ Token expires on: ${expiryDate.toISOString()}`);
        }
      }
      
      // Check scopes
      if (payload.scopes && Array.isArray(payload.scopes)) {
        const requiredScopes = [
          'order-processing',
          'customer.order.read',
          'customer.order.write'
        ];
        const missingScopes = requiredScopes.filter(scope => !payload.scopes.includes(scope));
        if (missingScopes.length > 0) {
          console.log(`  ⚠️  Missing required scopes: ${missingScopes.join(', ')}`);
          hasWarnings = true;
        } else {
          console.log('  ✅ All required scopes present');
        }
      }
    } catch (error) {
      console.log('  ⚠️  Could not decode token payload');
    }
  } else {
    console.log('  ❌ BASALAM_API_TOKEN: Invalid JWT format (expected 3 parts)');
    hasErrors = true;
  }
}

// Environment-specific checks
console.log('\n🌍 Environment-Specific Checks:');
const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`  Current environment: ${nodeEnv}`);

if (nodeEnv === 'production') {
  const callbackUrl = process.env.BASALAM_CALLBACK_URL;
  if (callbackUrl && !callbackUrl.startsWith('https://')) {
    console.log('  ⚠️  Production callback URL should use HTTPS');
    hasWarnings = true;
  } else {
    console.log('  ✅ Callback URL uses HTTPS');
  }
  
  if (token && (token.includes('test') || token.includes('dev'))) {
    console.log('  ⚠️  Token appears to be a test/dev token in production');
    hasWarnings = true;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ Validation FAILED: Please fix the errors above');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Validation PASSED with warnings: Review warnings above');
  process.exit(0);
} else {
  console.log('✅ Validation PASSED: All Basalam environment variables are properly configured');
  process.exit(0);
}
