# Supabase Storage Setup Guide

This guide explains how to set up Supabase Storage for image uploads in the Acquisition Monitor app.

## Overview

The app now supports:
- **Direct image upload** with automatic compression (max 300KB)
- **Paste URL** option for external images
- **Drag & drop** support
- Storage in Supabase Storage bucket

---

## Step 1: Create Storage Bucket

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Bucket name**: `avatars`
   - **Public**: ✅ Enabled (toggle on)
   - **File size limit**: `5242880` (5MB in bytes)
   - **Allowed MIME types**: Leave empty (allow all) or add: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
5. Click **Create bucket**

### Option B: Via SQL Editor (Requires Superuser)

If you have superuser access, run this in the SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('avatars', 'avatars', true, 5242880);
```

---

## Step 2: Set Up Storage Policies

After creating the bucket, you need to add policies for access control.

### Run in SQL Editor:

```sql
-- Allow public read access
CREATE POLICY "Public Access - Avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow public upload
CREATE POLICY "Public Upload - Avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

-- Allow public update
CREATE POLICY "Public Update - Avatars" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars');

-- Allow public delete
CREATE POLICY "Public Delete - Avatars" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars');
```

---

## Step 3: Verify Setup

1. In Supabase Dashboard, go to **Storage** > `avatars` bucket
2. You should see an empty bucket with no files yet
3. Check that policies are listed under the **Policies** tab

---

## Step 4: Test Image Upload

1. Start your development server: `npm run dev`
2. Go to **Manage** tab
3. Try creating a new team:
   - Enter team name
   - Click **Upload** tab in the image uploader
   - Drag an image or click to select
   - Watch the compression progress
   - Image should upload and preview should appear
4. Click **DAFTAR TIM** to save

---

## How It Works

### Image Compression

When a user uploads an image:

1. **Client-side compression** using Canvas API
2. Target size: **300KB** maximum
3. Process:
   - Resize if larger than 1920x1920px
   - Compress to JPEG format
   - Adjust quality (0.9 → 0.3) until target size reached
   - Further resize if needed (80% scale)

### File Storage Structure

```
avatars/
├── teams/
│   ├── {team-id}-{timestamp}-{random}.jpg
│   └── ...
└── members/
    ├── {member-id}-{timestamp}-{random}.jpg
    └── ...
```

### URL Format

Uploaded images get public URLs like:
```
https://{project-id}.supabase.co/storage/v1/object/public/avatars/teams/abc123-1234567890-xyz.jpg
```

---

## Troubleshooting

### "Bucket not found" error

**Solution**: Make sure the bucket name is exactly `avatars` (lowercase, no spaces)

### "Permission denied" error

**Solution**: Check that storage policies are created correctly:
```sql
-- List all policies for avatars bucket
SELECT * FROM storage.policies 
WHERE object_name LIKE 'avatars%';
```

### Images not compressing

**Solution**: Check browser console for errors. Compression requires:
- Modern browser with Canvas API support
- Valid image file (JPEG, PNG, WebP, GIF)

### Upload fails silently

**Solution**: 
1. Check browser console for errors
2. Verify Supabase URL and anon key in `.env.local`
3. Check Supabase project storage quota

---

## File Size Limits

| Stage | Limit |
|-------|-------|
| Upload (input) | 5MB max |
| After compression | ≤300KB target |
| Supabase Storage | Depends on plan (free: 1GB total) |

---

## Security Notes

### Current Setup (Development)

- **Public read/write**: Anyone with the URL can upload/delete files
- Suitable for: Development and testing

### Production Recommendations

1. **Enable authentication**: Require login for uploads
2. **Row-level security**: Link uploads to user IDs
3. **Signed URLs**: Use temporary URLs instead of public access
4. **Image validation**: Add server-side file type checking
5. **Quota management**: Monitor storage usage

Example authenticated policy:
```sql
-- Only authenticated users can upload
CREATE POLICY "Authenticated Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);
```

---

## Cleanup (Optional)

To delete orphaned files when teams/members are deleted, uncomment the trigger functions in `supabase-schema.sql`:

```sql
-- Auto-delete team avatars
CREATE TRIGGER after_team_delete
AFTER DELETE ON teams
FOR EACH ROW EXECUTE FUNCTION delete_team_avatar();

-- Auto-delete member avatars
CREATE TRIGGER after_member_delete
AFTER DELETE ON members
FOR EACH ROW EXECUTE FUNCTION delete_member_avatar();
```

---

## Cost Estimation

### Supabase Free Tier
- **Storage**: 1GB
- **Bandwidth**: 2GB/month
- **Estimated capacity**: ~3,400 images at 300KB each

### Pro Tier ($25/month)
- **Storage**: 100GB
- **Bandwidth**: 250GB/month
- **Estimated capacity**: ~340,000 images at 300KB each

---

## Support

If you encounter issues:
1. Check Supabase dashboard for error logs
2. Review browser console for client-side errors
3. Verify all setup steps are completed
4. Check Supabase documentation: https://supabase.com/docs/guides/storage
