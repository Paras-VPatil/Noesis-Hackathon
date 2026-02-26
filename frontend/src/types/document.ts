export type SourceFormat =
  | "PDF"
  | "DOCX"
  | "PPTX"
  | "XLSX"
  | "TXT"
  | "IMAGE"
  | "GDOC";

export type ConfidenceTier = "HIGH" | "MEDIUM" | "NOT_FOUND";

export interface Citation {
  documentName: string;
  location: string;
  sourceFormat: SourceFormat;
}

export interface AnswerPayload {
  answer: string;
  confidence: ConfidenceTier;
  citations: Citation[];
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
