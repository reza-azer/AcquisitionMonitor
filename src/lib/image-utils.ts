/**
 * Image compression utilities using Canvas API
 * Compresses images to target file size without external dependencies
 */

export interface CompressedImage {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Compress an image file to target size (in KB)
 * @param file - The image file to compress
 * @param maxSizeKB - Target maximum size in KB (default: 300)
 * @returns Promise with compressed image data
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = 300
): Promise<CompressedImage> {
  // Create image element
  const img = await loadImage(file);
  
  // Resize if too large (max 1920px)
  const maxWidth = 1920;
  const maxHeight = 1920;
  let width = img.width;
  let height = img.height;
  
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Draw image on white background (for PNG transparency)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  
  // Compress with quality adjustment loop
  let quality = 0.9;
  let blob: Blob | null = null;
  
  do {
    blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b!),
        'image/jpeg',
        quality
      );
    });
    
    quality -= 0.1;
  } while (blob.size > maxSizeKB * 1024 && quality >= 0.3);
  
  // If still too large, resize further
  if (blob.size > maxSizeKB * 1024) {
    const newWidth = Math.floor(width * 0.8);
    const newHeight = Math.floor(height * 0.8);
    
    if (newWidth > 100 && newHeight > 100) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      quality = 0.7;
      do {
        blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b!),
            'image/jpeg',
            quality
          );
        });
        quality -= 0.1;
      } while (blob.size > maxSizeKB * 1024 && quality >= 0.2);
    }
  }
  
  if (!blob) {
    throw new Error('Failed to compress image');
  }
  
  return {
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Load an image from file
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate if file is an image
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(file.type);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Clean up object URL to prevent memory leaks
 */
export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}
