/**
 * Supabase Storage operations for image uploads
 */

import { supabase } from './supabase';

const BUCKET_NAME = 'avatars';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file or blob to upload
 * @param folder - Folder name ('teams' or 'members')
 * @param entityId - Optional entity ID for naming
 * @returns Upload result with public URL
 */
export async function uploadImage(
  file: File | Blob,
  folder: 'teams' | 'members',
  entityId?: string
): Promise<UploadResult> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = 'jpg'; // Always use jpg for compressed images
    const filename = entityId
      ? `${folder}/${entityId}-${timestamp}-${randomStr}.${extension}`
      : `${folder}/${timestamp}-${randomStr}.${extension}`;

    // Create a File from Blob if needed
    const fileToUpload = file instanceof File ? file : new File([file], filename, { type: 'image/jpeg' });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete an image from Supabase Storage
 * @param imageUrl - The public URL of the image to delete
 * @returns Success status
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/storage/v1/object/public/avatars/');
    
    if (pathParts.length < 2) {
      return false;
    }
    
    const filePath = pathParts[1];

    // Delete from storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}

/**
 * Check if storage bucket exists and is accessible
 */
export async function checkStorageAccess(): Promise<{
  accessible: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    if (error) {
      return {
        accessible: false,
        error: error.message,
      };
    }

    return {
      accessible: true,
    };
  } catch (error) {
    return {
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
