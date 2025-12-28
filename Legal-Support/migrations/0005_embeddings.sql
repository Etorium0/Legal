-- Embeddings storage for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS unit_embeddings (
  unit_id UUID PRIMARY KEY REFERENCES units(id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Similarity index for faster semantic search
CREATE INDEX IF NOT EXISTS idx_unit_embeddings_embedding ON unit_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Keep model column searchable
CREATE INDEX IF NOT EXISTS idx_unit_embeddings_model ON unit_embeddings(model);
