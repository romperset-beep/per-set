// Validation utilities for security and data integrity

/**
 * Validates file size against maximum allowed size
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in megabytes
 * @returns true if valid, throws error if invalid
 */
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        throw new Error(`Fichier trop volumineux (max ${maxSizeMB} MB). Taille actuelle: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    }
    return true;
};

/**
 * Validates file MIME type against allowed types
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if valid, throws error if invalid
 */
export const validateFileMimeType = (file: File, allowedTypes: string[]): boolean => {
    if (!allowedTypes.includes(file.type)) {
        throw new Error(`Type de fichier non autorisé: ${file.type}. Types acceptés: ${allowedTypes.join(', ')}`);
    }
    return true;
};

/**
 * Validates price for marketplace items
 * @param price - Price to validate
 * @returns true if valid, throws error if invalid
 */
export const validatePrice = (price: number): boolean => {
    // Allow -1 for "Price TBD"
    if (price === -1) return true;

    if (price < 0) {
        throw new Error('Le prix ne peut pas être négatif (sauf -1 pour "Prix à définir")');
    }

    if (price > 1000000) {
        throw new Error('Le prix ne peut pas dépasser 1 000 000 €');
    }

    return true;
};

/**
 * Validates expense amount
 * @param amountTTC - Total amount including tax
 * @param amountTVA - VAT amount (optional)
 * @returns true if valid, throws error if invalid
 */
export const validateExpenseAmount = (amountTTC: number, amountTVA?: number): boolean => {
    if (amountTTC < 0) {
        throw new Error('Le montant ne peut pas être négatif');
    }

    if (amountTTC > 10000) {
        throw new Error('Le montant ne peut pas dépasser 10 000 € par note de frais');
    }

    if (amountTVA !== undefined && amountTVA > amountTTC) {
        throw new Error('La TVA ne peut pas être supérieure au montant TTC');
    }

    return true;
};

/**
 * Comprehensive file validation for uploads
 * @param file - File to validate
 * @param options - Validation options
 */
export const validateFile = (
    file: File,
    options: {
        maxSizeMB?: number;
        allowedTypes?: string[];
    } = {}
): boolean => {
    const { maxSizeMB, allowedTypes } = options;

    // Determine max size based on file type if not specified
    const defaultMaxSize = file.type === 'application/pdf' ? 50 : 10;
    const maxSize = maxSizeMB || defaultMaxSize;

    // Default allowed types
    const defaultAllowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf'
    ];
    const types = allowedTypes || defaultAllowedTypes;

    validateFileSize(file, maxSize);
    validateFileMimeType(file, types);

    return true;
};
