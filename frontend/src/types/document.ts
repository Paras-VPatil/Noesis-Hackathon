export type SourceFormat =
  | "PDF"
  | "DOCX"
  | "PPTX"
  | "XLSX"
  | "TXT"
  | "IMAGE"
  | "GDOC";

export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW" | "NOT_FOUND";

export interface Citation {
  documentName?: string;
  location?: string;
  fileName?: string;
  locationRef?: string;
  chunkId?: string;
  sourceFormat: SourceFormat;
}

export interface AnswerPayload {
  answer: string;
  confidence: ConfidenceTier;
  confidenceTier?: ConfidenceTier;
  confidenceScore?: number;
  citations: Citation[];
  evidenceSnippets?: string[];
  sessionId?: string;
}

export interface PracticeQuestion {
  id: string;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  sourceFormat: SourceFormat;
  locationRef: string;
}
