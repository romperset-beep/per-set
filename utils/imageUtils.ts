/**
 * Compresses an image file to a maximum dimension and quality.
 * @param file The original image file.
 * @param maxWidth The maximum width or height of the output image (default 1024px).
 * @param quality The compression quality from 0 to 1 (default 0.6).
 * @returns A Promise resolving to the compressed File object.
 */
export const compressImage = async (file: File, maxWidth = 800, quality = 0.6): Promise<File> => {
    // If not an image, return original
    if (!file.type.startsWith('image/')) {
        return file;
    }

    const compress = async (w: number, q: number): Promise<File> => {
        let canvas: HTMLCanvasElement | null = null;
        try {
            // Advanced method: createImageBitmap (Very fast, low memory)
            if (typeof createImageBitmap !== 'undefined') {
                const bitmap = await createImageBitmap(file);
                canvas = document.createElement('canvas');

                let width = bitmap.width;
                let height = bitmap.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > w) {
                        height *= w / width;
                        width = w;
                    }
                } else {
                    if (height > w) {
                        width *= w / height;
                        height = w;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(bitmap, 0, 0, width, height);
                    bitmap.close(); // Important: Release memory immediately

                    return new Promise((resolve) => {
                        canvas!.toBlob((blob) => {
                            if (!blob) {
                                resolve(file);
                                return;
                            }
                            const newFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(newFile);
                        }, 'image/jpeg', q);
                    });
                }
            }
        } catch (e) {
            console.warn("createImageBitmap failed, falling back to legacy method", e);
        } finally {
            // Explicit cleanup
            if (canvas) {
                canvas.width = 0;
                canvas.height = 0;
                canvas = null;
            }
        }

        // Legacy Fallback (Slower, higher memory usage but compatible)
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const elem = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > w) {
                        height *= w / width;
                        width = w;
                    }
                } else {
                    if (height > w) {
                        width *= w / height;
                        height = w;
                    }
                }
                elem.width = width;
                elem.height = height;

                const ctx = elem.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                ctx.canvas.toBlob((blob) => {
                    // Cleanup inside callback
                    elem.width = 0;
                    elem.height = 0;

                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    const newFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(newFile);
                }, 'image/jpeg', q);
            };

            img.onerror = (err) => {
                URL.revokeObjectURL(objectUrl);
                resolve(file);
            };

            img.src = objectUrl;
        });
    };

    // Pre-downscaling for huge files (>2MB) to prevent immediate OOM
    let targetWidth = maxWidth;
    let targetQuality = quality;

    if (file.size > 2 * 1024 * 1024) {
        console.log("File > 2MB, applying aggressive pre-scaling");
        targetWidth = Math.min(maxWidth, 1280); // Cap at 1280px max for first pass
        targetQuality = Math.min(quality, 0.5);
    }

    // First Pass
    let compressed = await compress(targetWidth, targetQuality);

    // Iterative Aggressive Compression if still > 1MB (Max 3 attempts)
    let attempts = 0;
    while (compressed.size > 1024 * 1024 && attempts < 3) {
        attempts++;
        targetWidth = Math.floor(targetWidth * 0.7); // Reduce size by 30% each time
        targetQuality = Math.max(0.4, targetQuality - 0.1); // Reduce quality

        console.log(`[Compression] Retry ${attempts}: ${targetWidth}px, Q:${targetQuality.toFixed(1)}`);
        compressed = await compress(targetWidth, targetQuality);
    }

    return compressed;
};

/**
 * Applies a "Scan Effect" to an image (Grayscale + High Contrast).
 * @param file The original image file.
 * @returns A Promise resolving to the processed File object.
 */
export const applyScanEffect = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(file);
                return;
            }

            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Contrast factor (approx high contrast)
            // Value 0-255. 128 is neutral. >128 increases contrast.
            const contrast = 50;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

            for (let i = 0; i < data.length; i += 4) {
                // Grayscale (Luma coding)
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

                // Apply Contrast to the grayscale value
                // Color = factor * (val - 128) + 128
                let newValue = factor * (gray - 128) + 128;

                // Clamp 0-255
                newValue = Math.max(0, Math.min(255, newValue));

                data[i] = newValue;     // R
                data[i + 1] = newValue; // G
                data[i + 2] = newValue; // B
                // Alpha (data[i+3]) remains unchanged
            }

            ctx.putImageData(imageData, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(file);
                    return;
                }
                const newFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                });
                resolve(newFile);
            }, 'image/jpeg', 0.8); // High quality for text readability
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
        };

        img.src = objectUrl;
    });
};
