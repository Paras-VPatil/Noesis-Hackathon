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

export const qaApi = {
  async askQuestion(question: string, subject: Subject): Promise<AnswerPayload> {
    if (import.meta.env.VITE_USE_REAL_API === "true") {
      const response = await apiClient.post<AnswerPayload>("/qa/ask", {
        question,
        subjectId: subject.id
      });
      return response.data;
    }

    await new Promise((resolve) => setTimeout(resolve, 550));
    const tier = getConfidenceTier(question);
    const match = Object.entries(mockEvidence).find(([keyword]) =>
      question.toLowerCase().includes(keyword)
    );

    if (tier === "NOT_FOUND") {
      return {
        answer: `Not found in your notes for ${subject.name}`,
        confidence: "NOT_FOUND",
        citations: []
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
        ]
      };
    }

    return {
      answer: match?.[1].answer ?? "No relevant context found.",
      confidence: "HIGH",
      citations: match?.[1].citations ?? []
    };
  }
};
