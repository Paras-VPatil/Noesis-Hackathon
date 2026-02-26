import { useSyncExternalStore } from "react";
import type { Subject } from "../types/subject";

interface SubjectState {
  selectedSubjectId: string;
  subjects: Subject[];
}

const FIXED_SUBJECTS: Subject[] = [
  {
    id: "maths",
    name: "Maths",
    examLabel: "Core Subject",
    documentCount: 0,
    coverage: 0
  },
  {
    id: "chemistry",
    name: "Chemistry",
    examLabel: "Core Subject",
    documentCount: 0,
    coverage: 0
  },
  {
    id: "physics",
    name: "Physics",
    examLabel: "Core Subject",
    documentCount: 0,
    coverage: 0
  }
];

let state: SubjectState = {
  selectedSubjectId: FIXED_SUBJECTS[0].id,
  subjects: FIXED_SUBJECTS
};

const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const subjectStore = {
  getState: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setSelectedSubject(subjectId: string) {
    if (!state.subjects.some((subject) => subject.id === subjectId)) {
      return;
    }
    state = { ...state, selectedSubjectId: subjectId };
    notify();
  }
};

export const useSubjectStore = () =>
  useSyncExternalStore(subjectStore.subscribe, subjectStore.getState, subjectStore.getState);
