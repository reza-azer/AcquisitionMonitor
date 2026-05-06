# Quick Start - Image Upload Feature

## 🚀 Setup (5 minutes)

### 1. Create Storage Bucket in Supabase

```
Dashboard → Storage → New bucket
- Name: avatars
- Public: ON
- File size limit: 5242880
```

### 2. Add Storage Policies

Go to **SQL Editor** and run:

```sql
CREATE POLICY "Public Access - Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public Upload - Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Public Update - Avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
CREATE POLICY "Public Delete - Avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars');
```

### 3. Done! Start using the feature

---

## 📸 How to Upload Images

### Method 1: Upload (Recommended)

1. **Manage** tab → Create/Edit Team or Member
2. Click **Upload** tab
3. **Drag & drop** image OR **click to browse**
4. Watch compression progress:
   ```
   ✓ Compressed: 287 KB (was 2.4 MB)
   ```
5. Image auto-uploads to Supabase
6. Click **Save**

### Method 2: Paste URL

1. **Manage** tab → Create/Edit Team or Member
2. Click **Paste URL** tab
3. Paste image URL (e.g., from external hosting)
4. Click **Set**
5. Preview appears
6. Click **Save**

---

## 🎯 Features at a Glance

| Feature | Upload | Paste URL |
|---------|--------|-----------|
| Drag & drop | ✅ | ❌ |
| Auto compression | ✅ (to 300KB) | ❌ |
| Preview | ✅ | ✅ |
| Progress indicator | ✅ | ❌ |
| Error handling | ✅ | ✅ |
| Remove option | ✅ | ✅ |

---

## 📊 Compression Info

**What happens when you upload:**

```
Original Image (3.2 MB, 4000x3000px)
       ↓
Resize to 1920px max
       ↓
Compress JPEG (quality 0.9 → 0.3)
       ↓
Final Image (287 KB, 1920x1440px)
       ↓
Upload to Supabase Storage
       ↓
Public URL saved to database
```

**Compression ratio:** Typically 90-95% size reduction!

---

## 🔧 Troubleshooting

### "Upload failed"
- Check Supabase Storage bucket exists (`avatars`)
- Verify storage policies are added
- Check browser console for errors

### Image won't compress
- File must be valid image (JPEG, PNG, WebP, GIF)
- Max file size: 5MB (before compression)

### Can't see uploaded image
- Verify bucket is **public**
- Check image URL in browser
- Clear browser cache

---

## 💡 Tips

1. **Best results**: Upload images 1-3MB for optimal compression
2. **Transparent PNGs**: Converted to white background JPEG
3. **Google Drive links**: Make sure sharing is set to "Anyone with link can view"
4. **External URLs**: Use direct image links (end with .jpg, .png, etc.)

---

## 📁 File Organization

```
Supabase Storage: avatars/
├── teams/
│   ├── abc123-1234567890-xyz.jpg  (Team cover images)
│   └── ...
└── members/
    ├── def456-1234567891-abc.jpg  (Member avatars)
    └── ...
```

---

## ✅ Pre-Launch Checklist

- [ ] Created `avatars` storage bucket
- [ ] Added 4 storage policies
- [ ] Tested team image upload
- [ ] Tested member image upload
- [ ] Verified compression works
- [ ] Checked images are publicly accessible
- [ ] Tested paste URL feature
- [ ] Verified error handling works

**All done? You're ready to go! 🎉**

---

## 📚 More Info

- Full setup guide: `STORAGE_SETUP.md`
- Implementation details: `IMAGE_UPLOAD_SUMMARY.md`
- Database schema: `supabase-schema.sql`
