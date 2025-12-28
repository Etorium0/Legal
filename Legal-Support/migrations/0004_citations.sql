-- Citations between units (articles/clauses)
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  target_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_citations_source ON citations(source_unit_id);
CREATE INDEX IF NOT EXISTS idx_citations_target ON citations(target_unit_id);
