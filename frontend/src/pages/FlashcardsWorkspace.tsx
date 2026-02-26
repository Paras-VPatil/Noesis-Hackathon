import { BookOpenCheck, Sparkles } from "lucide-react";
import { useSubject } from "../hooks/useSubject";
import ChatInterface from "../components/ChatInterface";
import Heatmap from "../components/Heatmap";

interface FlashcardsWorkspaceProps {
  onOpenPracticeModal: () => void;
  onOpenStudyGuidesModal: () => void;
}

const FlashcardsWorkspace = ({
  onOpenPracticeModal,
  onOpenStudyGuidesModal
}: FlashcardsWorkspaceProps) => {
  const { selectedSubject } = useSubject();

  return (
    <section className="workspace-page">
      <header className="workspace-header">
        <div>
          <small>AskMyNotes</small>
          <h1>{selectedSubject.name} workspace</h1>
          <p>Chat with your notes, then generate practice tests and targeted study guides.</p>
        </div>
        <div className="workspace-actions">
          <button type="button" onClick={onOpenPracticeModal}>
            <BookOpenCheck size={18} />
            Practice test
          </button>
          <button type="button" onClick={onOpenStudyGuidesModal}>
            <Sparkles size={18} />
            Study guide
          </button>
        </div>
      </header>
      <div className="workspace-grid">
        <ChatInterface />
        <Heatmap />
      </div>
    </section>
  );
};

export default FlashcardsWorkspace;
