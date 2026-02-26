import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSubject } from "../hooks/useSubject";

const ExamSubjectPage = () => {
  const { subjectId } = useParams();
  const { selectedSubject, setSelectedSubject, subjects } = useSubject();

  useEffect(() => {
    if (subjectId && subjects.some((subject) => subject.id === subjectId)) {
      setSelectedSubject(subjectId);
    }
  }, [setSelectedSubject, subjectId, subjects]);

  return (
    <section className="subject-page">
      <h1>{selectedSubject.name}</h1>
      <p>{selectedSubject.examLabel}</p>
      <article>
        <h3>Documents indexed</h3>
        <strong>{selectedSubject.documentCount}</strong>
      </article>
      <article>
        <h3>Coverage</h3>
        <strong>{selectedSubject.coverage}%</strong>
      </article>
      <p>
        Open <strong>Flashcards</strong> from the sidebar to ask subject-scoped questions and generate practice
        tests.
      </p>
    </section>
  );
};

export default ExamSubjectPage;
