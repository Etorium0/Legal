# Legal Virtual Assistant Backend

A sophisticated legal knowledge query system built with Go, PostgreSQL, and graph-based knowledge representation. This system ingests legal documents, extracts semantic triples (Subject-Relation-Object), and provides intelligent query processing for legal information retrieval.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   HTTP API      │    │  Knowledge Graph │    │   PostgreSQL    │
│  (chi router)   │◄──►│   Processing     │◄──►│   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
│                      │                        │
▼                      ▼                        ▼
Query Engine          Ingestion Engine         Schema:
- Term Extraction     - Text Analysis          - documents
- Candidate Search    - Triple Extraction      - units  
- Star Matching       - Concept Recognition    - concepts
- Result Ranking      - Relation Mapping       - relations
                                               - triples
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Go 1.22+ (for local development)

### Run with Docker Compose
```bash
# Start all services (PostgreSQL + API)
make docker-up

# Check logs
make docker-logs

# Load sample legal data
make seed-data

# Stop services
make docker-down
```

The API will be available at `http://localhost:8080`

### Local Development
```bash
# Copy environment variables
cp .env.example .env

# Start PostgreSQL only
docker run -d \
  -e POSTGRES_DB=legaldb \
  -e POSTGRES_USER=legaluser \
  -e POSTGRES_PASSWORD=legalpass \
  -p 5432:5432 \
  postgres:15-alpine

# Run the application
make run

# Or build and run
make build
./bin/legal-api
```

## 📊 Data Model

The system uses a knowledge graph approach to represent legal information:

```
Documents (Laws, Decrees, Regulations)
    │
    ├── Units (Articles, Clauses, Points)
    │     │
    │     └── Text Content
    │
    └── Triples (Subject-Relation-Object)
          │
          ├── Concepts (Entities: "helmet", "motor vehicle", "fine")
          ├── Relations (Actions: "requires", "prohibits", "penalizes")  
          └── Context (Legal rules and conditions)
```

### Database Schema
- **documents**: Legal documents metadata
- **units**: Hierarchical text units (articles, clauses, points)
- **concepts**: Named entities and legal concepts
- **relations**: Relationships between concepts
- **triples**: Knowledge triples linking concepts via relations

## 🌐 API Endpoints

### 1. Query Legal Information
```http
POST /api/v1/query
Content-Type: application/json

{
  "text": "What is the fine for not wearing a helmet?",
  "debug": false
}
```

**Response:**
```json
{
  "answers": [
    {
      "doc_ref": "Law 23/2008/QH12 Article 8",
      "unit_id": "uuid-here",
      "snippet": "Failure to wear a helmet is prohibited and shall be fined from 2,000,000 to 3,000,000 VND.",
      "score": 0.85,
      "context": null
    }
  ],
  "debug": {
    "stars": [...],
    "candidates": [...],
    "timings": {...}
  }
}
```

### 2. Ingest Legal Content
```http
POST /api/v1/query/ingest
Content-Type: application/json

{
  "document": {
    "title": "Traffic Safety Law",
    "type": "Law",
    "number": "23/2008/QH12",
    "year": 2008,
    "authority": "National Assembly"
  },
  "units": [
    {
      "level": "article",
      "code": "Article 8",
      "text": "Motor vehicle drivers must wear helmets when driving...",
      "order_index": 1
    }
  ]
}
```

**Response:**
```json
{
  "document_id": "uuid-here",
  "units_created": 4,
  "triples_created": 12,
  "concepts_created": 8,
  "relations_created": 3,
  "processing_summary": "Successfully ingested document..."
}
```

### 3. Retrieve Legal Unit
```http
GET /api/v1/query/units/{unit_id}
```

**Response:**
```json
{
  "unit": {
    "id": "uuid-here",
    "level": "article", 
    "code": "Article 8",
    "text": "Motor vehicle drivers must wear helmets...",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "document": {
    "id": "uuid-here",
    "title": "Traffic Safety Law",
    "type": "Law",
    "number": "23/2008/QH12"
  }
}
```

## 🔍 Query Processing

The query engine uses a sophisticated multi-step approach:

### 1. Term Extraction
- Removes stop words ("what", "is", "the", etc.)
- Extracts meaningful terms and phrases
- Handles legal terminology and compound phrases

### 2. Candidate Search  
- Finds concept candidates (exact, synonym, keyword, fuzzy matches)
- Finds relation candidates from legal verbs and phrases
- Scores candidates by match quality

### 3. Star Pattern Building
- Creates Subject-Relation-Object query patterns
- Generates multiple query "stars" with different focus:
  - Comprehensive (all subjects, relations, objects)
  - Relation-focused (specific legal actions)
  - Subject-focused (specific legal entities)
  - Object-focused (specific outcomes/penalties)

### 4. Triple Matching
- Executes star patterns against the knowledge graph
- Finds matching triples using database indexes
- Returns relevant legal rules and facts

### 5. Result Ranking
- Calculates relevance scores based on:
  - Query term overlap
  - Confidence scores
  - Text coverage
  - Star pattern weights
- Combines results across multiple stars
- Returns top-ranked legal answers

## 🧪 Testing

```bash
# Run all tests
make test

# Test specific packages
go test ./internal/graph
go test ./internal/query

# Run with coverage
go test -cover ./...
```

## 🛠️ Development

### Project Structure
```
cmd/
  api/main.go              # Application entry point
internal/
  config/config.go         # Configuration management
  db/db.go                 # Database connection
  query/http.go            # HTTP handlers
  graph/                   # Legal knowledge graph
    models.go              # Data structures
    repository.go          # Database operations
    ingestion.go           # Content processing
    query_engine.go        # Query processing
    graph_test.go          # Unit tests
migrations/
  0001_init.sql           # User management
  0002_legal.sql          # Legal knowledge schema
```

### Adding New Legal Patterns

To add new legal text patterns for triple extraction:

1. Update `extractTriplesFromText` in `ingestion.go`
2. Add new regex patterns for your legal domain
3. Create corresponding relations in the database
4. Test with sample legal text

Example:
```go
// Pattern for "X is defined as Y"
definitionPatterns := []string{
    `([a-zA-Z\s]+) is defined as ([a-zA-Z\s]+)`,
    `([a-zA-Z\s]+) means ([a-zA-Z\s]+)`,
}
```

### Environment Variables
- `HTTP_PORT`: API server port (default: 8080)
- `DATABASE_URL`: PostgreSQL connection string

## 📝 Examples

### Sample Queries
```bash
# Helmet regulations
curl -X POST http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"text": "helmet requirements for motorcycles"}'

# Parking restrictions  
curl -X POST http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"text": "can I park in residential areas at night?"}'

# Fine amounts
curl -X POST http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"text": "what is the penalty for traffic violations?"}'

# Debug mode
curl -X POST http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"text": "dual carriageway rules", "debug": true}'
```

### Sample Legal Content
See `sample_data.json` for example legal document structure.

## 🚧 Roadmap

- [ ] Machine Learning integration for better concept extraction
- [ ] Semantic embeddings for similarity search
- [ ] Multi-language support
- [ ] Voice query interface
- [ ] Legal document version tracking
- [ ] Advanced analytics and reporting
- [ ] Integration with external legal databases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Ensure all tests pass: `make test`
5. Check code formatting: `gofmt -s -w .`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏷️ Tags
`go` `postgresql` `legal-tech` `knowledge-graph` `nlp` `api` `docker` `chi-router`
