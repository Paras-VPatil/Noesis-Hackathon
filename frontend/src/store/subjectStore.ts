import { useSyncExternalStore } from "react";
import type { FolderItem, Subject } from "../types/subject";

interface SubjectState {
  selectedSubjectId: string;
  subjects: Subject[];
  folders: FolderItem[];
}

let state: SubjectState = {
  selectedSubjectId: "jee-main",
  subjects: [
    {
      id: "jee-main",
      name: "JEE Main",
      examLabel: "Engineering Entrance",
      documentCount: 5,
      coverage: 62
    },
    {
      id: "neet",
      name: "NEET",
      examLabel: "Medical Entrance",
      documentCount: 4,
      coverage: 38
    },
    {
      id: "biology",
      name: "Biology",
      examLabel: "Subject Revision",
      documentCount: 7,
      coverage: 71
    }
  ],
  folders: [{ id: "folder-1", name: "Unit Tests" }]
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
    state = { ...state, selectedSubjectId: subjectId };
    notify();
  },
  addFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    state = {
      ...state,
      folders: [...state.folders, { id: `folder-${Date.now()}`, name: trimmed }]
    };
    notify();
  }
};

export const useSubjectStore = () =>
  useSyncExternalStore(subjectStore.subscribe, subjectStore.getState, subjectStore.getState);
