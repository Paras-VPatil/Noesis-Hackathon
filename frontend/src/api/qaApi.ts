import type { AnswerPayload, Citation } from "../types/document";
import type { Subject } from "../types/subject";
import apiClient from "./axios";

const mockEvidence: Record<string, { answer: string; citations: Citation[]; evidenceSnippets: string[] }> = {
  photosynthesis: {
    answer:
      "Photosynthesis converts light energy into chemical energy in chloroplasts [SOURCE: Biology_Notes.pdf, Page 45].",
    citations: [
      {
        fileName: "Biology_Notes.pdf",
        locationRef: "Page 45",
        chunkId: "chunk-photosynthesis-45",
        sourceFormat: "PDF"
      }
    ],
    evidenceSnippets: [
      "[Biology_Notes.pdf | Page 45] Photosynthesis occurs in chloroplasts where light energy is transformed to glucose."
    ]
  },
  genetics: {
    answer:
      "Mendel's law of segregation states that allele pairs separate during gamete formation [SOURCE: Genetics_Lecture.pptx, Slide 12].",
    citations: [
      {
        fileName: "Genetics_Lecture.pptx",
        locationRef: "Slide 12",
        chunkId: "chunk-genetics-12",
        sourceFormat: "PPTX"
      }
    ],
    evidenceSnippets: [
      "[Genetics_Lecture.pptx | Slide 12] During meiosis, alleles separate so each gamete receives one allele."
    ]
  },
  equation: {
    answer:
      "The noted equation is CO2 + H2O + light -> C6H12O6 + O2 [SOURCE: Study_Table.xlsx, Sheet Reactions, Row B4:D7].",
    citations: [
      {
        fileName: "Study_Table.xlsx",
        locationRef: "Sheet Reactions, Row B4:D7",
        chunkId: "chunk-equation-b4",
        sourceFormat: "XLSX"
      }
    ],
    evidenceSnippets: [
      "[Study_Table.xlsx | Sheet Reactions, Row B4:D7] CO2 + H2O + light -> C6H12O6 + O2."
    ]
  }
};

const requestCandidates = (path: string) =>
  path.startsWith("/api/v1") ? [path] : [path, `/api/v1${path}`];

interface BackendSubject {
  id: string;
  name: string;
}

const tryPost = async <T,>(path: string, data: unknown): Promise<T> => {
  let lastError: unknown;

  for (const candidate of requestCandidates(path)) {
    try {
      const response = await apiClient.post<T>(candidate, data);
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const tryGet = async <T,>(path: string): Promise<T> => {
  let lastError: unknown;

  for (const candidate of requestCandidates(path)) {
    try {
      const response = await apiClient.get<T>(candidate);
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const ensureBackendSubject = async (subject: Subject) => {
  const subjects = await tryGet<BackendSubject[]>("/subjects");
  const match =
    subjects.find((item) => item.id === subject.id) ??
    subjects.find((item) => item.name.trim().toLowerCase() === subject.name.trim().toLowerCase());

  if (match) {
    return match.id;
  }

  const created = await tryPost<BackendSubject>("/subjects", { name: subject.name });
  return created.id;
};

const strictNotFound = (subjectName: string): AnswerPayload => ({
  answer: `Not found in your notes for ${subjectName}`,
  confidenceTier: "NOT_FOUND",
  confidenceScore: 0,
  citations: [],
  evidenceSnippets: []
});

const normalizeResponse = (payload: Partial<AnswerPayload>, subjectName: string): AnswerPayload => {
  const answer = payload.answer?.trim() ?? "";
  const confidenceTier = payload.confidenceTier ?? "NOT_FOUND";
  const confidenceScore = Number(payload.confidenceScore ?? 0);
  const citations = payload.citations ?? [];
  const evidenceSnippets = payload.evidenceSnippets ?? [];

  if (
    confidenceTier === "NOT_FOUND" ||
    answer.toLowerCase().startsWith("not found in your notes") ||
    citations.length === 0
  ) {
    return {
      ...strictNotFound(subjectName),
      evidenceSnippets
    };
  }

  return {
    answer,
    confidenceTier,
    confidenceScore,
    citations,
    evidenceSnippets,
    topChunkIds: payload.topChunkIds ?? []
  };
};

export const qaApi = {
  async askQuestion(question: string, subject: Subject, history?: any[]): Promise<AnswerPayload> {
    if (import.meta.env.VITE_USE_REAL_API === "true") {
      const subjectId = await ensureBackendSubject(subject);
      const result = await tryPost<AnswerPayload>("/qa", {
        query: question,
        subjectId,
        history
      });
      return normalizeResponse(result, subject.name);
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simulate multi-turn memory if history exists and user asks a follow-up
    if (history && history.length > 0 && question.toLowerCase().includes("simplify")) {
      return normalizeResponse({
        answer: "In simpler terms based on our conversation, it means energy from the sun is captured to make food (glucose) for the plant! [SOURCE: Biology_Notes.pdf, Page 45]",
        confidenceTier: "HIGH",
        confidenceScore: 0.98,
        citations: [{ fileName: "Biology_Notes.pdf", locationRef: "Page 45", chunkId: "c1", sourceFormat: "PDF" }],
        evidenceSnippets: ["[Biology_Notes.pdf | Page 45] Photosynthesis occurs in chloroplasts where light energy is transformed to glucose."]
      }, subject.name);
    }

    await new Promise((resolve) => setTimeout(resolve, 450));
    const matched = Object.entries(mockEvidence).find(([keyword]) =>
      question.toLowerCase().includes(keyword)
    );

    if (!matched) {
      return strictNotFound(subject.name);
    }

    return normalizeResponse(
      {
        answer: matched[1].answer,
        confidenceTier: "HIGH",
        confidenceScore: 0.94,
        citations: matched[1].citations,
        evidenceSnippets: matched[1].evidenceSnippets,
        topChunkIds: matched[1].citations.map((citation) => citation.chunkId)
      },
      subject.name
    );
  }
};
