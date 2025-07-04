-- Create storage bucket for review photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-photos',
  'review-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for review photos bucket

-- Allow anyone to view photos (since bucket is public)
CREATE POLICY "Anyone can view review photos" ON storage.objects
FOR SELECT USING (bucket_id = 'review-photos');

-- Allow authenticated users to upload photos to their own folders
CREATE POLICY "Users can upload review photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'review-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'public'
);

-- Allow users to update their own photos
CREATE POLICY "Users can update their own review photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'review-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'public'
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own review photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'review-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'public'
); 