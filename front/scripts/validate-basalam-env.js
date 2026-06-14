#!/usr/bin/env node

/**
 * Basalam Frontend Environment Variables Validation Script
 * 
 * This script validates that all required Basalam environment variables
 * are properly configured for the frontend application.
 */

const requiredVars = [
  'VITE_BASALAM_API_URL',
  'VITE_BASALAM_ORDER_API_URL',
  'VITE_BASALAM_CALLBACK_URL'
];

console.log('🔍 Validating Basalam frontend environment variables...\n');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`  ❌ ${varName}: NOT SET`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${varName}: ${value}`);
  }
});

// Validate URL formats
console.log('\n🔗 URL Validation:');
requiredVars.forEach(varName => {
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

// Environment-specific checks
console.log('\n🌍 Environment-Specific Checks:');
const mode = process.env.MODE || process.env.NODE_ENV || 'development';
console.log(`  Current mode: ${mode}`);

if (mode === 'production') {
  const callbackUrl = process.env.VITE_BASALAM_CALLBACK_URL;
  if (callbackUrl && !callbackUrl.startsWith('https://')) {
    console.log('  ⚠️  Production callback URL should use HTTPS');
    hasWarnings = true;
  } else {
    console.log('  ✅ Callback URL uses HTTPS');
  }
  
  if (callbackUrl && callbackUrl.includes('localhost')) {
    console.log('  ❌ Production callback URL should not use localhost');
    hasErrors = true;
  }
}

// Check for consistency with backend
console.log('\n🔄 Backend Consistency:');
const apiBaseUrl = process.env.VITE_API_BASE_URL;
const callbackUrl = process.env.VITE_BASALAM_CALLBACK_URL;

if (apiBaseUrl && callbackUrl) {
  try {
    const apiUrl = new URL(apiBaseUrl);
    const cbUrl = new URL(callbackUrl);
    
    if (apiUrl.origin !== cbUrl.origin) {
      console.log('  ⚠️  Callback URL origin differs from API base URL origin');
      console.log(`     API: ${apiUrl.origin}`);
      console.log(`     Callback: ${cbUrl.origin}`);
      hasWarnings = true;
    } else {
      console.log('  ✅ Callback URL matches API base URL origin');
    }
  } catch (error) {
    // URL parsing already failed above
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
