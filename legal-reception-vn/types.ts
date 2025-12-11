export interface Source {
  document: string;
  unit: string;
  url: string;
}

export interface Triple {
  subject: string;
  relation: string;
  object: string;
  context?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  sources?: Source[];
  triples?: Triple[];
  isThinking?: boolean;
}

export interface LegalDocument {
  id: string;
  title: string;
  type: string;
  number: string;
  year: number;
  issued_by: string;
  effective_date: string;
}

export enum AppView {
  ASSISTANT = 'assistant',
  DOCUMENTS = 'documents',
  GRAPH = 'graph',
  SETTINGS = 'settings'
}

// Graph Visualization Types
export interface GraphNode {
  id: string;
  group: number; // 1: Subject, 2: Object
  
  // d3.SimulationNodeDatum properties
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
  
  // d3.SimulationLinkDatum properties
  index?: number;
}
