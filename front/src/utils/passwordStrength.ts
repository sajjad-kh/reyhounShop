export interface PasswordStrength {
    score: number; // 0-4 (0: very weak, 4: very strong)
    feedback: string[];
    isValid: boolean;
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    // Check length
    if (password.length >= 8) {
        score += 1;
    } else {
        feedback.push('Password must be at least 8 characters long');
    }

    // Check for lowercase letters
    if (/[a-z]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add lowercase letters');
    }

    // Check for uppercase letters
    if (/[A-Z]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add uppercase letters');
    }

    // Check for numbers
    if (/\d/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add numbers');
    }

    // Check for special characters
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add special characters');
    }

    // Bonus points for longer passwords
    if (password.length >= 12) {
        score = Math.min(score + 1, 4);
    }

    // Check for common patterns (reduce score)
    if (/(.)\1{2,}/.test(password)) { // Repeated characters
        score = Math.max(score - 1, 0);
        feedback.push('Avoid repeated characters');
    }

    if (/123|abc|qwe|password|admin/i.test(password)) { // Common patterns
        score = Math.max(score - 1, 0);
        feedback.push('Avoid common patterns');
    }

    return {
        score: Math.min(score, 4),
        feedback,
        isValid: score >= 3 && password.length >= 8,
    };
};

export const getPasswordStrengthLabel = (score: number): string => {
    switch (score) {
        case 0:
        case 1:
            return 'Very Weak';
        case 2:
            return 'Weak';
        case 3:
            return 'Good';
        case 4:
            return 'Strong';
        default:
            return 'Very Weak';
    }
};

export const getPasswordStrengthColor = (score: number): string => {
    switch (score) {
        case 0:
        case 1:
            return 'text-red-400';
        case 2:
            return 'text-orange-400';
        case 3:
            return 'text-yellow-400';
        case 4:
            return 'text-green-400';
        default:
            return 'text-red-400';
    }
};