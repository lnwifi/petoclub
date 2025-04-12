-- Create pets table
CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    age TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own pets
CREATE POLICY "Users can view their own pets" ON public.pets
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Create policy to allow users to insert their own pets
CREATE POLICY "Users can insert their own pets" ON public.pets
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Create policy to allow users to update their own pets
CREATE POLICY "Users can update their own pets" ON public.pets
    FOR UPDATE
    USING (auth.uid() = owner_id);

-- Create policy to allow users to delete their own pets
CREATE POLICY "Users can delete their own pets" ON public.pets
    FOR DELETE
    USING (auth.uid() = owner_id);

-- Create storage bucket for pet images if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'pet-images'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('pet-images', 'pet-images', true);
    END IF;
END
$$;

-- Set up storage policy to allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload pet images" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'pet-images' AND (storage.foldername(name))[1] = 'pets');

-- Set up storage policy to allow public access to pet images
CREATE POLICY "Public access to pet images" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'pet-images');