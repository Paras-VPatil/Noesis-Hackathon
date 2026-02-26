import type { Subject } from "../types/subject";
import apiClient from "./axios";

const mockSubjects: Subject[] = [
  { id: "maths", name: "Maths", examLabel: "Core Subject", documentCount: 0, coverage: 0 },
  { id: "chemistry", name: "Chemistry", examLabel: "Core Subject", documentCount: 0, coverage: 0 },
  { id: "physics", name: "Physics", examLabel: "Core Subject", documentCount: 0, coverage: 0 }
];

export const subjectApi = {
  async listSubjects(): Promise<Subject[]> {
    if (import.meta.env.VITE_USE_REAL_API === "true") {
      const response = await apiClient.get<Subject[]>("/subjects");
      return response.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 180));
    return mockSubjects;
  }
};
