const SubjectPage = () => {
  return (
    <section className="study-groups-page">
      <div className="study-groups-hero">
        <div className="hero-graphic">
          <div className="card"></div>
          <div className="avatar-row">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <h1>
          Get your study group on Quizlet
          <br />
          and study flashcards together
        </h1>
        <button type="button">Create a group</button>
        <a href="#learn">Learn more about study groups</a>
      </div>

      <footer>
        <div>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </div>
        <button type="button">English (UK)</button>
      </footer>
    </section>
  );
};

export default SubjectPage;
