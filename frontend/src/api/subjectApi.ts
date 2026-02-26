import type { Subject } from "../types/subject";
import apiClient from "./axios";

const mockSubjects: Subject[] = [
  { id: "jee-main", name: "JEE Main", examLabel: "Engineering Entrance", documentCount: 5, coverage: 62 },
  { id: "neet", name: "NEET", examLabel: "Medical Entrance", documentCount: 4, coverage: 38 },
  { id: "biology", name: "Biology", examLabel: "Subject Revision", documentCount: 7, coverage: 71 }
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
