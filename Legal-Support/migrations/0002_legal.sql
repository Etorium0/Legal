-- Legal Knowledge Graph Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Legal documents (laws, regulations, etc.)
CREATE TABLE IF NOT EXISTS documents(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- law, decree, circular, etc.
  number TEXT,        -- document number
  year INTEGER,
  authority TEXT,     -- issuing authority
  status TEXT DEFAULT 'active', -- active, superseded, repealed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legal text units (articles, clauses, points)
CREATE TABLE IF NOT EXISTS units(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  level TEXT NOT NULL, -- article, clause, point, section
  code TEXT,          -- Article 15, Clause 1, Point a, etc.
  text TEXT NOT NULL, -- the actual legal text
  parent_id UUID REFERENCES units(id), -- for hierarchical structure
  order_index INTEGER DEFAULT 0, -- ordering within parent
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legal concepts (entities, actions, conditions)
CREATE TABLE IF NOT EXISTS concepts(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  synonyms TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  concept_type TEXT DEFAULT 'general', -- entity, action, condition, penalty, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relations between concepts
CREATE TABLE IF NOT EXISTS relations(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  relation_type TEXT DEFAULT 'general', -- requires, prohibits, defines, penalizes, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge triples (Subject-Relation-Object)
CREATE TABLE IF NOT EXISTS triples(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
  relation_id UUID REFERENCES relations(id) ON DELETE CASCADE,
  object_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  doc_ref TEXT NOT NULL, -- human readable reference
  confidence REAL DEFAULT 1.0, -- confidence score for the triple
  tfidf REAL DEFAULT 0.0, -- TF-IDF score for ranking
  is_blacklisted BOOLEAN DEFAULT FALSE, -- whether this triple should be excluded
  context TEXT, -- additional context or conditions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search optimization indexes
CREATE INDEX IF NOT EXISTS idx_documents_type_year ON documents(type, year);
CREATE INDEX IF NOT EXISTS idx_units_document_level ON units(document_id, level);
CREATE INDEX IF NOT EXISTS idx_units_code ON units(code);
CREATE INDEX IF NOT EXISTS idx_concepts_name_gin ON concepts USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_concepts_name_trgm ON concepts USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_concepts_name_lower_trgm ON concepts USING gin (LOWER(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_concepts_synonyms ON concepts USING gin(synonyms);
CREATE INDEX IF NOT EXISTS idx_concepts_keywords ON concepts USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_relations_name_gin ON relations USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_relations_keywords ON relations USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_triples_subject ON triples(subject_id);
CREATE INDEX IF NOT EXISTS idx_triples_relation ON triples(relation_id);
CREATE INDEX IF NOT EXISTS idx_triples_object ON triples(object_id);
CREATE INDEX IF NOT EXISTS idx_triples_unit ON triples(unit_id);
CREATE INDEX IF NOT EXISTS idx_triples_doc_ref ON triples(doc_ref);
CREATE INDEX IF NOT EXISTS idx_triples_sro ON triples(subject_id, relation_id, object_id);
CREATE INDEX IF NOT EXISTS idx_triples_tfidf ON triples(tfidf DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_triples_blacklist ON triples(is_blacklisted) WHERE is_blacklisted = false;

-- Full text search on unit text
CREATE INDEX IF NOT EXISTS idx_units_text_search ON units USING gin(to_tsvector('english', text));
