export type DocItem = {
  id: string
  title: string
  type: string
  number?: string | null
  year?: number | null
  authority?: string | null
  status?: string | null
  created_at?: string
  updated_at?: string
}

export type UnitItem = {
  id: string
  level: string
  code?: string | null
  text: string
  order_index: number
  parent_id?: string | null
  children?: UnitItem[]
}

export type CitationItem = {
  id: string
  source_unit_id: string
  target_unit_id: string
  note: string
  peer_code: string
  peer_level: string
  peer_document_id: string
  peer_document: string
  peer_snippet: string
}

export type UnitDetail = {
  document: { title?: string; type?: string };
  unit: { id?: string; level?: string; code?: string; text?: string };
};
