import apiClient from "./axios";

export interface MCQ {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  sourceChunkId: string;
}

export interface SAQ {
  question: string;
  modelAnswer: string;
  sourceChunkId: string;
}

export interface StudyTestResponse {
  mcqs: MCQ[];
  saqs: SAQ[];
}

const mockResponse: StudyTestResponse = {
  mcqs: [
    {
      question: "Which organelle is the primary site of photosynthesis?",
      options: ["Mitochondria", "Ribosome", "Chloroplast", "Nucleus"],
      correctOptionIndex: 2,
      explanation: "The chloroplast contains chlorophyll and is where photosynthesis occurs.",
      sourceChunkId: "chunk-1"
    },
    {
      question: "What is the primary function of the mitochondria?",
      options: ["Protein synthesis", "Energy production (ATP)", "Photosynthesis", "Cell division"],
      correctOptionIndex: 1,
      explanation: "Mitochondria are the powerhouse of the cell, generating most of the cell's supply of ATP.",
      sourceChunkId: "chunk-2"
    },
    {
      question: "Which of the following describes translation?",
      options: ["DNA to RNA", "RNA to Protein", "Protein to DNA", "RNA to DNA"],
      correctOptionIndex: 1,
      explanation: "Translation is the process where ribosomes synthesize proteins using the mRNA transcript.",
      sourceChunkId: "chunk-3"
    },
    {
      question: "What does Mendel's Law of Segregation state?",
      options: ["Genes blend", "Alleles separate during gamete formation", "Traits skip generations", "Mutations are random"],
      correctOptionIndex: 1,
      explanation: "Allele pairs separate during gamete formation, and randomly unite at fertilization.",
      sourceChunkId: "chunk-4"
    },
    {
      question: "Which enzyme is responsible for unzipping the DNA double helix?",
      options: ["DNA Polymerase", "Ligase", "Helicase", "Primase"],
      correctOptionIndex: 2,
      explanation: "Helicase unwinds the DNA double helix at the replication fork.",
      sourceChunkId: "chunk-5"
    }
  ],
  saqs: [
    {
      question: "Write the overall equation for photosynthesis.",
      modelAnswer: "6CO2 + 6H2O + Light Energy → C6H12O6 + 6O2",
      sourceChunkId: "chunk-6"
    },
    {
      question: "Explain the difference between genotype and phenotype.",
      modelAnswer: "Genotype refers to the genetic makeup of an organism, while phenotype refers to the observable physical traits.",
      sourceChunkId: "chunk-7"
    },
    {
      question: "What is the purpose of meiosis?",
      modelAnswer: "Meiosis is a type of cell division that reduces the number of chromosomes by half, producing four haploid gametes required for sexual reproduction.",
      sourceChunkId: "chunk-8"
    }
  ]
};

export const studyApi = {
  async generatePracticeTest(subjectId?: string): Promise<StudyTestResponse> {
    if (import.meta.env.VITE_USE_REAL_API === "true") {
      if (!subjectId) {
        throw new Error("A selected subject is required for subject-scoped study mode.");
      }
      const response = await apiClient.post<StudyTestResponse>(`/study/generate/${subjectId}`);
      return response.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return mockResponse;
  }
};
