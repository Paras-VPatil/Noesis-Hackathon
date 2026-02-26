import { Suspense, lazy, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import StudyGuideModal from "./components/StudyGuideModal";
import StudyMode from "./components/StudyMode";
import { useAuth } from "./hooks/useAuth";
import { useSubject } from "./hooks/useSubject";
import Dashboard from "./pages/Dashboard";
import FlashcardsWorkspace from "./pages/FlashcardsWorkspace";
import Home from "./pages/Home";
import PlaceholderPage from "./pages/PlaceholderPage";

const MissionGame = lazy(() => import("./components/MissionGame"));

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { selectedSubject, selectedSubjectId, setSelectedSubject, subjects } = useSubject();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [studyGuideOpen, setStudyGuideOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [toast, setToast] = useState("");

  const searchPlaceholder = useMemo(() => {
    if (location.pathname === "/library") {
      return "Search evidence, snippets, citations";
    }
    if (location.pathname === "/flashcards") {
      return "Ask subject-scoped questions from your notes";
    }
    return "Search in AskMyNotes";
  }, [location.pathname]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  return (
    <div className="app-root">
      <Sidebar
        activePath={location.pathname}
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        onNavigate={navigate}
        onSelectSubject={(subjectId) => {
          setSelectedSubject(subjectId);
          showToast(`Active subject set to ${subjects.find((subject) => subject.id === subjectId)?.name ?? ""}.`);
        }}
      />

      <main className="content-shell">
        <Navbar
          searchValue={searchValue}
          searchPlaceholder={searchPlaceholder}
          avatarUrl={user?.avatarUrl}
          onSearchChange={setSearchValue}
          onOpenPracticeModal={() => setPracticeOpen(true)}
          onOpenStudyGuidesModal={() => setStudyGuideOpen(true)}
          onProfileClick={() => showToast("Profile menu can be connected to auth settings.")}
        />

        <div className="page-scroll">
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  onLaunchMission={() => setMissionOpen(true)}
                  onOpenPracticeModal={() => setPracticeOpen(true)}
                  onShowMessage={showToast}
                />
              }
            />
            <Route path="/library" element={<Dashboard />} />
            <Route
              path="/flashcards"
              element={
                <FlashcardsWorkspace
                  onOpenPracticeModal={() => setPracticeOpen(true)}
                  onOpenStudyGuidesModal={() => setStudyGuideOpen(true)}
                />
              }
            />
            <Route
              path="/notifications"
              element={
                <PlaceholderPage
                  title="Notifications"
                  description="You're all caught up. Alerts will appear when new note-derived missions are ready."
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <StudyMode
        open={practiceOpen}
        onClose={() => setPracticeOpen(false)}
        onGenerated={(message) => showToast(message)}
      />

      <Suspense fallback={null}>
        <MissionGame
          open={missionOpen}
          subject={selectedSubject}
          onClose={() => setMissionOpen(false)}
          onShowMessage={showToast}
        />
      </Suspense>

      <StudyGuideModal
        open={studyGuideOpen}
        onClose={() => setStudyGuideOpen(false)}
        onGenerated={(message) => showToast(message)}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
};

export default App;
