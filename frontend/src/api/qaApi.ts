import type { AnswerPayload, Citation } from "../types/document";
import type { Subject } from "../types/subject";
import apiClient from "./axios";

const mockEvidence: Record<string, { answer: string; citations: Citation[] }> = {
  photosynthesis: {
    answer:
      "Photosynthesis is the process where plants convert light energy into glucose using carbon dioxide and water.",
    citations: [
      {
        documentName: "Biology_Notes.pdf",
        location: "Page 45, Chapter 3",
        sourceFormat: "PDF"
      }
    ]
  },
  genetics: {
    answer: "Mendelian inheritance explains dominant and recessive traits across generations.",
    citations: [
      {
        documentName: "Genetics_Lecture.pptx",
        location: "Slide 12",
        sourceFormat: "PPTX"
      }
    ]
  },
  equation: {
    answer: "The balanced equation noted is CO2 + H2O + light -> C6H12O6 + O2.",
    citations: [
      {
        documentName: "Study_Table.xlsx",
        location: "Sheet Reactions, Row B4:D7",
        sourceFormat: "XLSX"
      }
    ]
  }
};

const getConfidenceTier = (query: string) => {
  if (query.length < 6) {
    return "NOT_FOUND";
  }
  const match = Object.keys(mockEvidence).find((keyword) =>
    query.toLowerCase().includes(keyword)
  );
  if (match) {
    return "HIGH";
  }
  if (query.toLowerCase().includes("define") || query.toLowerCase().includes("explain")) {
    return "MEDIUM";
  }
  return "NOT_FOUND";
};

const normalizeSourceFormat = (value: string | undefined): Citation["sourceFormat"] => {
  const normalized = (value ?? "TXT").toUpperCase();
  if (
    normalized === "PDF" ||
    normalized === "DOCX" ||
    normalized === "PPTX" ||
    normalized === "XLSX" ||
    normalized === "TXT" ||
    normalized === "IMAGE" ||
    normalized === "GDOC"
  ) {
    return normalized;
  }
  return "TXT";
};

const normalizeAnswerPayload = (payload: Record<string, unknown>): AnswerPayload => {
  const rawConfidence = (payload.confidence ?? payload.confidenceTier ?? "NOT_FOUND") as string;
  const confidence = (
    rawConfidence === "HIGH" ||
    rawConfidence === "MEDIUM" ||
    rawConfidence === "LOW" ||
    rawConfidence === "NOT_FOUND"
      ? rawConfidence
      : "NOT_FOUND"
  ) as AnswerPayload["confidence"];

  const citations = Array.isArray(payload.citations)
    ? payload.citations.map((item) => {
        const record = item as Record<string, string>;
        return {
          documentName: record.documentName ?? record.fileName,
          location: record.location ?? record.locationRef,
          fileName: record.fileName,
          locationRef: record.locationRef,
          chunkId: record.chunkId,
          sourceFormat: normalizeSourceFormat(record.sourceFormat)
        };
      })
    : [];

  return {
    answer: typeof payload.answer === "string" ? payload.answer : "",
    confidence,
    confidenceTier: confidence,
    confidenceScore:
      typeof payload.confidenceScore === "number" ? payload.confidenceScore : undefined,
    citations,
    evidenceSnippets: Array.isArray(payload.evidenceSnippets)
      ? (payload.evidenceSnippets as string[])
      : [],
    sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined
  };
};

const createMockSessionId = () =>
  `mock-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const qaApi = {
  async askQuestion(
    question: string,
    subject: Subject,
    sessionId?: string
  ): Promise<AnswerPayload> {
    if (import.meta.env.VITE_USE_REAL_API === "true") {
      const response = await apiClient.post<Record<string, unknown>>("/qa/ask", {
        question,
        query: question,
        sessionId,
        subjectId: subject.id
      });
      return normalizeAnswerPayload(response.data);
    }

    await new Promise((resolve) => setTimeout(resolve, 550));
    const tier = getConfidenceTier(question);
    const activeSessionId = sessionId ?? createMockSessionId();
    const match = Object.entries(mockEvidence).find(([keyword]) =>
      question.toLowerCase().includes(keyword)
    );

    if (tier === "NOT_FOUND") {
      return {
        answer: `Not found in your notes for ${subject.name}`,
        confidence: "NOT_FOUND",
        citations: [],
        evidenceSnippets: [],
        sessionId: activeSessionId
      };
    }

    if (tier === "MEDIUM") {
      return {
        answer:
          "I found partially related content in your notes. Please verify this against the cited section before using it.",
        confidence: "MEDIUM",
        citations: [
          {
            documentName: `${subject.name}_Revision.docx`,
            location: "Section 2.3, Paragraph 4",
            sourceFormat: "DOCX"
          }
        ],
        evidenceSnippets: [],
        sessionId: activeSessionId
      };
    }

    return {
      answer: match?.[1].answer ?? "No relevant context found.",
      confidence: "HIGH",
      citations: match?.[1].citations ?? [],
      evidenceSnippets: [],
      sessionId: activeSessionId
    };
  }
};
