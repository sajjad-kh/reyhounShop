import { sanitizeInput, sanitizeText } from './security';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    sanitized?: string;
}

export const validateEmail = (email: string): ValidationResult => {
    if (!email) {
        return { isValid: false, error: 'Email is required' };
    }

    // Sanitize email input
    const sanitized = sanitizeInput(email).toLowerCase().trim();

    // Check length
    if (sanitized.length > 254) {
        return { isValid: false, error: 'Email address is too long' };
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(sanitized)) {
        return { isValid: false, error: 'Please enter a valid email address' };
    }

    return { isValid: true, sanitized };
};

export const validatePassword = (password: string): ValidationResult => {
    if (!password) {
        return { isValid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
        return { isValid: false, error: 'Password must be at least 8 characters long' };
    }

    if (password.length > 128) {
        return { isValid: false, error: 'Password is too long' };
    }

    // Check for at least one uppercase, one lowercase, one number
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        return {
            isValid: false,
            error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        };
    }

    return { isValid: true };
};

export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
    if (!confirmPassword) {
        return { isValid: false, error: 'Please confirm your password' };
    }

    if (password !== confirmPassword) {
        return { isValid: false, error: 'Passwords do not match' };
    }

    return { isValid: true };
};

export const validateName = (name: string): ValidationResult => {
    if (!name) {
        return { isValid: false, error: 'Name is required' };
    }

    // Sanitize name input
    const sanitized = sanitizeText(name).trim();

    if (sanitized.length < 2) {
        return { isValid: false, error: 'Name must be at least 2 characters long' };
    }

    if (sanitized.length > 50) {
        return { isValid: false, error: 'Name must be less than 50 characters' };
    }

    // Only allow letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(sanitized)) {
        return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
    }

    return { isValid: true, sanitized };
};

export const validatePhone = (phone: string): ValidationResult => {
    if (!phone) {
        return { isValid: true }; // Phone is optional
    }

    // Sanitize phone input
    const sanitized = sanitizeInput(phone).replace(/[\s\-\(\)]/g, '');

    // Validate phone format (international format)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(sanitized)) {
        return { isValid: false, error: 'Please enter a valid phone number' };
    }

    return { isValid: true, sanitized };
};

export const validateBirthDate = (birthDate: string): ValidationResult => {
    if (!birthDate) {
        return { isValid: true }; // Birth date is optional
    }

    const date = new Date(birthDate);
    const today = new Date();
    const minAge = 13;
    const maxAge = 120;

    if (isNaN(date.getTime())) {
        return { isValid: false, error: 'Please enter a valid date' };
    }

    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();

    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    if (actualAge < minAge) {
        return { isValid: false, error: `You must be at least ${minAge} years old` };
    }

    if (actualAge > maxAge) {
        return { isValid: false, error: 'Please enter a valid birth date' };
    }

    return { isValid: true };
};

/**
 * Validate credit card number (Luhn algorithm)
 */
export const validateCreditCard = (cardNumber: string): ValidationResult => {
    if (!cardNumber) {
        return { isValid: false, error: 'Card number is required' };
    }

    // Remove spaces and dashes
    const sanitized = sanitizeInput(cardNumber).replace(/[\s\-]/g, '');

    // Check if only digits
    if (!/^\d+$/.test(sanitized)) {
        return { isValid: false, error: 'Card number must contain only digits' };
    }

    // Check length (13-19 digits for most cards)
    if (sanitized.length < 13 || sanitized.length > 19) {
        return { isValid: false, error: 'Invalid card number length' };
    }

    // Luhn algorithm validation
    let sum = 0;
    let isEven = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
        let digit = parseInt(sanitized[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    if (sum % 10 !== 0) {
        return { isValid: false, error: 'Invalid card number' };
    }

    return { isValid: true, sanitized };
};

/**
 * Validate CVV/CVC code
 */
export const validateCVV = (cvv: string): ValidationResult => {
    if (!cvv) {
        return { isValid: false, error: 'CVV is required' };
    }

    const sanitized = sanitizeInput(cvv).replace(/\s/g, '');

    // CVV should be 3 or 4 digits
    if (!/^\d{3,4}$/.test(sanitized)) {
        return { isValid: false, error: 'CVV must be 3 or 4 digits' };
    }

    return { isValid: true, sanitized };
};

/**
 * Validate expiry date (MM/YY or MM/YYYY format)
 */
export const validateExpiryDate = (expiry: string): ValidationResult => {
    if (!expiry) {
        return { isValid: false, error: 'Expiry date is required' };
    }

    const sanitized = sanitizeInput(expiry).replace(/\s/g, '');

    // Check format MM/YY or MM/YYYY
    const expiryRegex = /^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/;
    if (!expiryRegex.test(sanitized)) {
        return { isValid: false, error: 'Expiry date must be in MM/YY or MM/YYYY format' };
    }

    const [month, year] = sanitized.split('/');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Convert 2-digit year to 4-digit
    const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);

    // Check if card is expired
    if (fullYear < currentYear || (fullYear === currentYear && parseInt(month, 10) < currentMonth)) {
        return { isValid: false, error: 'Card has expired' };
    }

    // Check if expiry is too far in the future (more than 20 years)
    if (fullYear > currentYear + 20) {
        return { isValid: false, error: 'Invalid expiry date' };
    }

    return { isValid: true, sanitized };
};

/**
 * Validate postal/zip code
 */
export const validatePostalCode = (postalCode: string, countryCode: string = 'US'): ValidationResult => {
    if (!postalCode) {
        return { isValid: false, error: 'Postal code is required' };
    }

    const sanitized = sanitizeInput(postalCode).toUpperCase().trim();

    // Different formats for different countries
    const patterns: Record<string, RegExp> = {
        US: /^\d{5}(-\d{4})?$/,
        CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/,
        UK: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/,
        IR: /^\d{10}$/, // Iran postal code
    };

    const pattern = patterns[countryCode] || /^[A-Z0-9\s\-]{3,10}$/;

    if (!pattern.test(sanitized)) {
        return { isValid: false, error: 'Invalid postal code format' };
    }

    return { isValid: true, sanitized };
};

/**
 * Validate URL
 */
export const validateUrl = (url: string): ValidationResult => {
    if (!url) {
        return { isValid: false, error: 'URL is required' };
    }

    const sanitized = sanitizeInput(url).trim();

    try {
        const parsed = new URL(sanitized);

        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
        }

        return { isValid: true, sanitized };
    } catch {
        return { isValid: false, error: 'Invalid URL format' };
    }
};

/**
 * Validate address
 */
export const validateAddress = (address: string): ValidationResult => {
    if (!address) {
        return { isValid: false, error: 'Address is required' };
    }

    const sanitized = sanitizeText(address).trim();

    if (sanitized.length < 5) {
        return { isValid: false, error: 'Address must be at least 5 characters long' };
    }

    if (sanitized.length > 200) {
        return { isValid: false, error: 'Address must be less than 200 characters' };
    }

    return { isValid: true, sanitized };
};

/**
 * Validate city name
 */
export const validateCity = (city: string): ValidationResult => {
    if (!city) {
        return { isValid: false, error: 'City is required' };
    }

    const sanitized = sanitizeText(city).trim();

    if (sanitized.length < 2) {
        return { isValid: false, error: 'City name must be at least 2 characters long' };
    }

    if (sanitized.length > 50) {
        return { isValid: false, error: 'City name must be less than 50 characters' };
    }

    // Only allow letters, spaces, hyphens, and apostrophes
    const cityRegex = /^[a-zA-Z\s\-']+$/;
    if (!cityRegex.test(sanitized)) {
        return { isValid: false, error: 'City name can only contain letters, spaces, hyphens, and apostrophes' };
    }

    return { isValid: true, sanitized };
};

/**
 * Validate quantity (for cart items)
 */
export const validateQuantity = (quantity: number, maxQuantity: number = 99): ValidationResult => {
    if (quantity === undefined || quantity === null) {
        return { isValid: false, error: 'Quantity is required' };
    }

    if (!Number.isInteger(quantity)) {
        return { isValid: false, error: 'Quantity must be a whole number' };
    }

    if (quantity < 1) {
        return { isValid: false, error: 'Quantity must be at least 1' };
    }

    if (quantity > maxQuantity) {
        return { isValid: false, error: `Quantity cannot exceed ${maxQuantity}` };
    }

    return { isValid: true };
};

/**
 * Validate price
 */
export const validatePrice = (price: number): ValidationResult => {
    if (price === undefined || price === null) {
        return { isValid: false, error: 'Price is required' };
    }

    if (typeof price !== 'number' || isNaN(price)) {
        return { isValid: false, error: 'Price must be a valid number' };
    }

    if (price < 0) {
        return { isValid: false, error: 'Price cannot be negative' };
    }

    if (price > 1000000) {
        return { isValid: false, error: 'Price is too high' };
    }

    return { isValid: true };
};

/**
 * Validate discount code
 */
export const validateDiscountCode = (code: string): ValidationResult => {
    if (!code) {
        return { isValid: false, error: 'Discount code is required' };
    }

    const sanitized = sanitizeInput(code).toUpperCase().trim();

    if (sanitized.length < 3) {
        return { isValid: false, error: 'Discount code must be at least 3 characters long' };
    }

    if (sanitized.length > 20) {
        return { isValid: false, error: 'Discount code must be less than 20 characters' };
    }

    // Only allow alphanumeric characters and hyphens
    const codeRegex = /^[A-Z0-9\-]+$/;
    if (!codeRegex.test(sanitized)) {
        return { isValid: false, error: 'Discount code can only contain letters, numbers, and hyphens' };
    }

    return { isValid: true, sanitized };
};