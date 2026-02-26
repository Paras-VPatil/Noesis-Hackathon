import { BookText, Globe, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";

type GuideTab = "paste" | "upload" | "drive";

interface StudyGuideModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (message: string) => void;
}

const StudyGuideModal = ({ open, onClose, onGenerated }: StudyGuideModalProps) => {
  const [tab, setTab] = useState<GuideTab>("paste");
  const [inputValue, setInputValue] = useState("");

  const canGenerate = useMemo(() => inputValue.trim().length > 30 || tab !== "paste", [inputValue, tab]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay">
      <div className="overlay__content">
        <header className="overlay__header">
          <div className="overlay__title">
            <BookText size={25} />
            <h2>Generate study guides</h2>
          </div>
          <button className="ghost-icon" type="button" onClick={onClose} aria-label="Close modal">
            <X size={26} />
          </button>
        </header>

        <div className="overlay__body">
          <div className="tab-row">
            <button className={`tab-button ${tab === "paste" ? "active" : ""}`} onClick={() => setTab("paste")}>
              Paste text
            </button>
            <button className={`tab-button ${tab === "upload" ? "active" : ""}`} onClick={() => setTab("upload")}>
              Upload files
            </button>
            <button className={`tab-button ${tab === "drive" ? "active" : ""}`} onClick={() => setTab("drive")}>
              Google Drive
            </button>
          </div>

          {tab === "paste" ? (
            <div>
              <textarea
                className="text-area text-area--large"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Paste your notes here. We'll do the rest."
              />
              <p className="char-count">{inputValue.length}/100,000 characters</p>
            </div>
          ) : null}

          {tab === "upload" ? (
            <div className="upload-card upload-card--small">
              <Upload size={48} />
              <h4>Drop files to build your study guide</h4>
              <button type="button" onClick={() => setInputValue("uploaded file selected")}>
                Browse files
              </button>
            </div>
          ) : null}

          {tab === "drive" ? (
            <div className="upload-card upload-card--small">
              <Globe size={48} />
              <h4>Connect Google Drive to import source notes</h4>
              <button type="button" onClick={() => setInputValue("drive connected")}>
                Connect Drive
              </button>
            </div>
          ) : null}

          <section className="guide-meta">
            <h4>This upload will also provide:</h4>
            <div>
              <span className="pill">Flashcards</span>
              <p>Memorise your material</p>
            </div>
          </section>
        </div>

        <footer className="overlay__footer">
          <p>
            This product is enhanced with AI and may provide incorrect or problematic content. Do not enter
            any personal data.
          </p>
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => {
              onGenerated("Study guide generated from provided material.");
              onClose();
              setInputValue("");
              setTab("paste");
            }}
          >
            Generate
          </button>
        </footer>
      </div>
    </div>
  );
};

export default StudyGuideModal;
