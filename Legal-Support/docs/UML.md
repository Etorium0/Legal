# UML & Sơ Đồ Kỹ Thuật (Mermaid)

> Các sơ đồ ở dạng Mermaid để dễ bảo trì. Có thể copy vào công cụ render (Mermaid Live, VSCode extension) hoặc đưa trực tiếp vào tài liệu Markdown.

## 1. Component Diagram (Tổng quan hệ thống)
```mermaid
flowchart LR
  subgraph Client
    U[User / Postman / UI]
  end
  subgraph Server[Backend]
    API[HTTP API (chi router)]
    Q[Query Engine]
    ING[Ingestion Service]
    REPO[Repository Layer]
  end
  subgraph Storage
    DB[(PostgreSQL)]
  end

  U --> API
  API --> Q
  API --> ING
  Q --> REPO
  ING --> REPO
  REPO --> DB
```

## 2. Deployment Diagram (Logic triển khai)
```mermaid
flowchart TB
  Dev[Developer Machine]
  subgraph DockerHost
    C1[Container: API]
    C2[Container: PostgreSQL]
    C3[Optional: pgAdmin / Adminer]
  end
  Dev -->|docker-compose build/up| DockerHost
  C1 --> C2
  Dev -->|Query / Test| C1
```

## 3. Class Diagram (Các struct chính – giản lược)
```mermaid
classDiagram
  class Document {
    +UUID ID
    +string Title
    +string Type
    +*string Number
    +*int Year
    +*string Authority
    +string Status
    +time.Time CreatedAt
    +time.Time UpdatedAt
  }
  class Unit {
    +UUID ID
    +UUID DocumentID
    +string Level
    +*string Code
    +string Text
    +*UUID ParentID
    +int OrderIndex
    +time.Time CreatedAt
  }
  class Concept {
    +UUID ID
    +string Name
    +[]string Synonyms
    +[]string Keywords
    +string Type
    +time.Time CreatedAt
  }
  class Relation {
    +UUID ID
    +string Name
    +[]string Keywords
    +string RelationType
    +time.Time CreatedAt
  }
  class Triple {
    +UUID ID
    +UUID SubjectID
    +UUID RelationID
    +UUID ObjectID
    +UUID UnitID
    +string DocRef
    +float Confidence
    +float TfIdf
    +bool IsBlacklisted
    +string Context
    +time.Time CreatedAt
  }

  Document --> Unit : contains
  Unit --> Triple : referenced_by
  Concept --> Triple : subject/object
  Relation --> Triple : relation
```

## 4. Ingestion Sequence
```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as /ingest
  participant ING as IngestionService
  participant REPO as Repository
  participant DB as PostgreSQL
  C->>API: POST JSON (document + units)
  API->>ING: Forward request
  ING->>REPO: CreateDocument
  REPO->>DB: INSERT documents
  loop Units
    ING->>REPO: CreateUnit
    REPO->>DB: INSERT unit
  end
  ING->>ING: Extract Concepts/Relations
  ING->>REPO: Upsert Concepts/Relations
  REPO->>DB: SELECT/INSERT
  ING->>ING: Build Triples
  loop Triples
    ING->>REPO: InsertTriple
    REPO->>DB: INSERT triple
  end
  ING-->>API: Summary counts
  API-->>C: 201 response
```

## 5. Query Sequence
```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as /query
  participant QE as QueryEngine
  participant REPO as Repository
  participant DB as PostgreSQL
  C->>API: POST {text, debug}
  API->>QE: ProcessQuery
  QE->>QE: extractQueryTerms
  QE->>QE: findAllCandidates
  QE->>REPO: FindConceptCandidates
  REPO->>DB: SELECT concepts
  DB-->>REPO: rows
  REPO-->>QE: candidates
  QE->>QE: buildQueryStars
  loop stars
    QE->>REPO: FindTriplesByStar
    REPO->>DB: SELECT triples + joins
    DB-->>REPO: triple rows
    REPO-->>QE: TripleView[]
  end
  QE->>QE: combineAndRankResults
  QE-->>API: Answers + Debug
  API-->>C: 200 JSON
```

## 6. Activity Diagram – Query Flow
```mermaid
flowchart TD
  A[Nhận query text] --> B[Lowercase + tách từ]
  B --> C{Stopword?}
  C -- Yes --> B
  C -- No --> D[Thêm vào terms]
  D --> E[Tìm candidates concepts/relations]
  E --> F[Xây dựng stars]
  F --> G[Query triples theo stars]
  G --> H[Kết hợp & ranking]
  H --> I{debug?}
  I -- yes --> J[Đính kèm candidates + timings]
  I -- no --> K[Chỉ trả answers]
  J --> L[JSON Response]
  K --> L[JSON Response]
```

## 7. Activity Diagram – Ingestion Flow
```mermaid
flowchart TD
  A[Nhận JSON document+units] --> B[Validate]
  B --> C[Tạo document]
  C --> D[Loop units]
  D --> E[Tạo unit + map parent]
  E --> F{Còn unit?}
  F -- yes --> D
  F -- no --> G[Extract concepts & relations]
  G --> H[Upsert concepts]
  H --> I[Upsert relations]
  I --> J[Build triples]
  J --> K[Insert triples]
  K --> L[Return counts]
```

## 8. Use Case Diagram (Rút gọn)
```mermaid
flowchart LR
  Dev((Người vận hành)) --> UC1[Ingest dữ liệu luật]
  User((Người dùng)) --> UC2[Query luật]
  User --> UC3[Xem chi tiết điều]
  Admin((Admin)) --> UC4[Theo dõi thống kê]
```

## 9. Roadmap mở rộng bổ sung UML sau
- Sequence: RAG + LLM integration.
- Activity: Batch ingestion + retry queue.
- Component: Thêm Cache Layer / Vector Store.

---
(End UML)
