-- Migration: Add text_unaccent column to units table
-- This column stores unaccented Vietnamese text for better full-text search

-- Install unaccent extension if not exists
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add text_unaccent column
ALTER TABLE units ADD COLUMN IF NOT EXISTS text_unaccent TEXT;

-- Create a function to remove Vietnamese accents
CREATE OR REPLACE FUNCTION unaccent_vietnamese(text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN translate(
        text,
        'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềấệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyđAAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate text_unaccent for existing records
UPDATE units
SET text_unaccent = unaccent_vietnamese(text)
WHERE text_unaccent IS NULL;

-- Create index on text_unaccent for faster search
CREATE INDEX IF NOT EXISTS idx_units_text_unaccent_search
ON units USING gin(to_tsvector('simple', text_unaccent));

-- Create a trigger to auto-populate text_unaccent on insert/update
CREATE OR REPLACE FUNCTION update_text_unaccent()
RETURNS TRIGGER AS $$
BEGIN
    NEW.text_unaccent = unaccent_vietnamese(NEW.text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_text_unaccent
BEFORE INSERT OR UPDATE OF text ON units
FOR EACH ROW
EXECUTE FUNCTION update_text_unaccent();
