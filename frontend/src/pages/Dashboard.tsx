import { ChevronDown, FileStack } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const tabs = [
  "Flashcard sets",
  "Classes",
  "Folders",
  "Practice Tests",
  "Study guides",
  "Expert solutions"
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [sortByRecent, setSortByRecent] = useState(true);

  return (
    <section className="library-page">
      <header className="library-header">
        <h1>Your library</h1>
        <div className="tab-row tab-row--library">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab-button ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <button className="sort-chip" type="button" onClick={() => setSortByRecent((current) => !current)}>
        {sortByRecent ? "Recent" : "A-Z"} <ChevronDown size={15} />
      </button>

      <article className="empty-state">
        <FileStack size={100} />
        <h2>You have no sets yet</h2>
        <p>Sets you create or study will be shown here</p>
        <button type="button" onClick={() => navigate("/flashcards")}>
          Create a set
        </button>
      </article>
    </section>
  );
};

export default Dashboard;
