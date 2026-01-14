/**
 * Image processing utilities
 * Task 6: Image processing tools for THSR ticket management
 */

import heic2any from 'heic2any';

/**
 * Valid image MIME types supported by the application
 */
const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
];

/**
 * Valid file extensions (for fallback check when MIME type is not available)
 */
const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];

/**
 * Check if the file is a valid image format (JPG, PNG, or HEIC)
 * @param file - The file to validate
 * @returns true if the file is a valid image format
 */
export function isValidImageFormat(file: File): boolean {
  // Check MIME type first
  if (file.type && VALID_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }

  // Fallback: check file extension (useful when MIME type is not available)
  const fileName = file.name.toLowerCase();
  return VALID_IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

/**
 * Convert HEIC/HEIF image to JPG format
 * iPhone photos are often in HEIC format which is not widely supported
 * @param file - The HEIC file to convert
 * @returns Promise<File> - The converted JPG file
 * @throws Error if conversion fails
 */
export async function convertHeicToJpg(file: File): Promise<File> {
  // Check if the file is HEIC/HEIF format
  const isHeic =
    file.type.toLowerCase() === 'image/heic' ||
    file.type.toLowerCase() === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  // If not HEIC, return the original file
  if (!isHeic) {
    return file;
  }

  try {
    // Convert HEIC to JPG using heic2any library
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9, // High quality for OCR accuracy
    });

    // heic2any can return a single Blob or an array of Blobs
    const convertedBlob = Array.isArray(result) ? result[0] : result;

    // Create a new File from the converted Blob
    const convertedFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    const convertedFile = new File([convertedBlob], convertedFileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    return convertedFile;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to convert HEIC to JPG: ${errorMessage}`);
  }
}

/**
 * Compress an image by resizing it to a maximum width while maintaining aspect ratio
 * This helps reduce file size for storage and improves OCR processing speed
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (height will be scaled proportionally)
 * @returns Promise<File> - The compressed image file
 * @throws Error if compression fails
 */
export async function compressImage(
  file: File,
  maxWidth: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Create an image element to load the file
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Handle load error
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    // Process image once loaded
    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;

        // Only resize if image is wider than maxWidth
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw the resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image: canvas.toBlob returned null'));
              return;
            }

            // Create a new File from the compressed blob
            const compressedFile = new File([blob], file.name, {
              type: file.type || 'image/jpeg',
              lastModified: Date.now(),
            });

            // Clean up the object URL
            URL.revokeObjectURL(img.src);

            resolve(compressedFile);
          },
          file.type || 'image/jpeg',
          0.85 // Quality factor (0.85 provides good balance between size and quality)
        );
      } catch (error) {
        URL.revokeObjectURL(img.src);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        reject(new Error(`Failed to compress image: ${errorMessage}`));
      }
    };

    // Load the image from the file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Process an image file for OCR: convert HEIC if needed and optionally compress
 * This is a convenience function that combines convertHeicToJpg and compressImage
 * @param file - The image file to process
 * @param maxWidth - Optional maximum width for compression (default: no compression)
 * @returns Promise<File> - The processed image file ready for OCR
 */
export async function prepareImageForOCR(
  file: File,
  maxWidth?: number
): Promise<File> {
  // First, validate the image format
  if (!isValidImageFormat(file)) {
    throw new Error(
      'Invalid image format. Please use JPG, PNG, or HEIC format.'
    );
  }

  // Convert HEIC to JPG if needed
  let processedFile = await convertHeicToJpg(file);

  // Compress if maxWidth is specified
  if (maxWidth && maxWidth > 0) {
    processedFile = await compressImage(processedFile, maxWidth);
  }

  return processedFile;
}

/**
 * Convert an image file to WebP format for efficient cloud storage
 * WebP provides ~25-35% smaller file size compared to JPEG
 *
 * @param file - The original image file
 * @param quality - WebP quality (0-1), default 0.8 provides good balance
 * @param maxWidth - Maximum width to resize to (maintains aspect ratio)
 * @returns Promise<Blob> - WebP image blob
 */
export async function convertToWebP(
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1200
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate dimensions (maintain aspect ratio)
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to WebP
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert to WebP'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Convert Blob to Base64 data URL (fallback for local storage)
 *
 * @param blob - The image blob
 * @returns Promise<string> - Base64 data URL
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
