import type { PracticeQuestion } from "../types/document";
import apiClient from "./axios";

const mockQuestions: PracticeQuestion[] = [
  {
    id: "q1",
    question: "Which organelle is the primary site of photosynthesis?",
    options: ["Mitochondria", "Ribosome", "Chloroplast", "Nucleus"],
    answer: "Chloroplast",
    explanation: "The chloroplast contains chlorophyll and is where photosynthesis occurs.",
    sourceFormat: "PDF",
    locationRef: "Page 45"
  },
  {
    id: "q2",
    question: "What does Mendel's law of segregation state?",
    options: [
      "Genes blend during inheritance",
      "Alleles separate during gamete formation",
      "Chromosomes duplicate in meiosis",
      "Traits skip generations randomly"
    ],
    answer: "Alleles separate during gamete formation",
    explanation: "Each parent contributes one allele because allele pairs separate in meiosis.",
    sourceFormat: "PPTX",
    locationRef: "Slide 12"
  },
  {
    id: "q3",
    question: "Write the overall photosynthesis equation.",
    answer: "CO2 + H2O + light -> C6H12O6 + O2",
    explanation: "This equation summarizes conversion of light energy into chemical energy.",
    sourceFormat: "XLSX",
    locationRef: "Sheet Reactions, Row B4"
  }
];

export const studyApi = {
  async generatePracticeTest(): Promise<PracticeQuestion[]> {
    if (import.meta.env.VITE_USE_REAL_API === "true") {
      const response = await apiClient.post<PracticeQuestion[]>("/study/generate");
      return response.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 900));
    return mockQuestions;
  }
};
