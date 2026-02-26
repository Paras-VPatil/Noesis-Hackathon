import { subjectStore, useSubjectStore } from "../store/subjectStore";

export const useSubject = () => {
  const state = useSubjectStore();
  const selectedSubject =
    state.subjects.find((subject) => subject.id === state.selectedSubjectId) ?? state.subjects[0];

  return {
    ...state,
    selectedSubject,
    setSelectedSubject: subjectStore.setSelectedSubject
  };
};
