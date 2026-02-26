import { useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import StudyGuideModal from "./components/StudyGuideModal";
import StudyMode from "./components/StudyMode";
import { useAuth } from "./hooks/useAuth";
import { useSubject } from "./hooks/useSubject";
import Dashboard from "./pages/Dashboard";
import ExamSubjectPage from "./pages/ExamSubjectPage";
import FlashcardsWorkspace from "./pages/FlashcardsWorkspace";
import Home from "./pages/Home";
import PlaceholderPage from "./pages/PlaceholderPage";
import SubjectPage from "./pages/SubjectPage";

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addFolder, folders, setSelectedSubject } = useSubject();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [studyGuideOpen, setStudyGuideOpen] = useState(false);
  const [toast, setToast] = useState("");

  const searchPlaceholder = useMemo(() => {
    if (location.pathname === "/library") {
      return "Search for practice tests";
    }
    if (location.pathname === "/study-groups") {
      return "Flashcard sets, textbooks, questions";
    }
    return "Search for practice tests";
  }, [location.pathname]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  };

  const isGameRoute = location.pathname === "/";

  if (isGameRoute) {
    return (
      <>
        <main className="interland-route-shell">
          <Routes>
            <Route
              path="/"
              element={<Home onOpenPracticeModal={() => setPracticeOpen(true)} onShowMessage={showToast} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <StudyMode
          open={practiceOpen}
          onClose={() => setPracticeOpen(false)}
          onGenerated={(message) => showToast(message)}
        />
        <StudyGuideModal
          open={studyGuideOpen}
          onClose={() => setStudyGuideOpen(false)}
          onGenerated={(message) => showToast(message)}
        />

        {toast ? <div className="toast">{toast}</div> : null}
      </>
    );
  }

  return (
    <div className="app-root">
      <Sidebar
        activePath={location.pathname}
        folders={folders}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        onNavigate={(path) => {
          if (path.startsWith("/subject/")) {
            const subjectId = path.replace("/subject/", "");
            setSelectedSubject(subjectId);
          }
          navigate(path);
        }}
        onAddFolder={() => {
          addFolder(`Folder ${folders.length + 1}`);
          showToast("New folder added.");
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
          onUpgradeClick={() => showToast("Trial flow triggered (frontend only).")}
        />

        <div className="page-scroll">
          <Routes>
            <Route
              path="/"
              element={<Home onOpenPracticeModal={() => setPracticeOpen(true)} onShowMessage={showToast} />}
            />
            <Route path="/library" element={<Dashboard />} />
            <Route path="/study-groups" element={<SubjectPage />} />
            <Route
              path="/flashcards"
              element={
                <FlashcardsWorkspace
                  onOpenPracticeModal={() => setPracticeOpen(true)}
                  onOpenStudyGuidesModal={() => setStudyGuideOpen(true)}
                />
              }
            />
            <Route path="/subject/:subjectId" element={<ExamSubjectPage />} />
            <Route
              path="/notifications"
              element={
                <PlaceholderPage
                  title="Notifications"
                  description="You're all caught up. Notification actions can be wired to backend events later."
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
