/**
 * Image validation utilities for product image uploads
 */

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    validFiles: File[];
}

export interface ImageDimensions {
    width: number;
    height: number;
}

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_COUNT = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MIN_DIMENSION = 300;

// Error messages in Persian
export const ERROR_MESSAGES = {
    FILE_TOO_LARGE: 'حجم فایل بیش از حد مجاز است (حداکثر 5MB)',
    INVALID_FORMAT: 'فرمت فایل مجاز نیست (فقط JPG, PNG, WebP)',
    TOO_MANY_FILES: 'تعداد فایل‌ها بیش از حد مجاز است (حداکثر 5 تصویر)',
    SMALL_DIMENSIONS: 'ابعاد تصویر کوچک است (حداقل 300x300 پیکسل)',
    NO_IMAGES: 'حداقل یک تصویر الزامی است',
    UPLOAD_FAILED: 'خطا در آپلود تصویر',
    DELETE_FAILED: 'خطا در حذف تصویر',
};

/**
 * Validates image files for upload
 * @param files - Array of files to validate
 * @returns ValidationResult with valid status, errors, and valid files
 */
export const validateImages = (files: File[]): ValidationResult => {
    const errors: string[] = [];
    let validFiles = [...files];

    // Check file count
    if (files.length > MAX_FILE_COUNT) {
        errors.push(`${ERROR_MESSAGES.TOO_MANY_FILES}`);
        validFiles = files.slice(0, MAX_FILE_COUNT);
    }

    // Validate each file
    validFiles = validFiles.filter((file, index) => {
        let isValid = true;

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            errors.push(`تصویر ${index + 1}: ${ERROR_MESSAGES.FILE_TOO_LARGE}`);
            isValid = false;
        }

        // Check file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            errors.push(`تصویر ${index + 1}: ${ERROR_MESSAGES.INVALID_FORMAT}`);
            isValid = false;
        }

        return isValid;
    });

    return {
        valid: errors.length === 0,
        errors,
        validFiles,
    };
};

/**
 * Checks image dimensions asynchronously
 * @param file - Image file to check
 * @returns Promise with width and height
 */
export const checkImageDimensions = (file: File): Promise<ImageDimensions> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
        };

        img.src = objectUrl;
    });
};

/**
 * Validates image dimensions and returns warnings
 * @param file - Image file to validate
 * @param index - Index of the file for error messages
 * @returns Promise with array of warning messages
 */
export const validateImageDimensions = async (
    file: File,
    index: number
): Promise<string[]> => {
    const warnings: string[] = [];

    try {
        const { width, height } = await checkImageDimensions(file);

        if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
            warnings.push(
                `تصویر ${index + 1}: ${ERROR_MESSAGES.SMALL_DIMENSIONS} (ابعاد فعلی: ${width}x${height})`
            );
        }
    } catch (error) {
        warnings.push(`تصویر ${index + 1}: خطا در بررسی ابعاد تصویر`);
    }

    return warnings;
};

/**
 * Validates all images including dimensions check
 * @param files - Array of files to validate
 * @returns Promise with ValidationResult including dimension warnings
 */
export const validateImagesWithDimensions = async (
    files: File[]
): Promise<ValidationResult & { warnings: string[] }> => {
    // First do basic validation
    const basicValidation = validateImages(files);

    // If basic validation failed, return early
    if (!basicValidation.valid) {
        return {
            ...basicValidation,
            warnings: [],
        };
    }

    // Check dimensions for valid files
    const warnings: string[] = [];
    const dimensionChecks = basicValidation.validFiles.map((file, index) =>
        validateImageDimensions(file, index)
    );

    const dimensionResults = await Promise.all(dimensionChecks);
    dimensionResults.forEach((result) => warnings.push(...result));

    return {
        ...basicValidation,
        warnings,
    };
};
