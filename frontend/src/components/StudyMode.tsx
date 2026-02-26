import { FileSpreadsheet, FileText, Globe, Upload, X } from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { studyApi } from "../api/studyApi";
import { useSubject } from "../hooks/useSubject";

type PracticeSourceTab = "upload" | "paste" | "drive" | "flashcards";

interface StudyModeProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (message: string) => void;
}

const tabLabels: Record<PracticeSourceTab, string> = {
  upload: "Upload files",
  paste: "Paste text",
  drive: "Google Drive",
  flashcards: "Flashcard sets"
};

const StudyMode = ({ open, onClose, onGenerated }: StudyModeProps) => {
  const { selectedSubject } = useSubject();
  const [tab, setTab] = useState<PracticeSourceTab>("upload");
  const [pasteText, setPasteText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [driveConnected, setDriveConnected] = useState(false);
  const [flashcardsSelected, setFlashcardsSelected] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canGenerate = useMemo(() => {
    if (tab === "upload") {
      return selectedFiles.length > 0;
    }
    if (tab === "paste") {
      return pasteText.trim().length > 25;
    }
    if (tab === "drive") {
      return driveConnected;
    }
    return flashcardsSelected;
  }, [driveConnected, flashcardsSelected, pasteText, selectedFiles.length, tab]);

  if (!open) {
    return null;
  }

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
  };

  const onGenerate = async () => {
    if (!canGenerate || generating) {
      return;
    }
    setGenerating(true);
    try {
      await studyApi.generatePracticeTest(selectedSubject.id);
      onGenerated(`Practice test generated for ${selectedSubject.name} from selected material.`);
      onClose();
      setPasteText("");
      setSelectedFiles([]);
      setDriveConnected(false);
      setFlashcardsSelected(false);
      setTab("upload");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="overlay">
      <div className="overlay__content">
        <header className="overlay__header">
          <div className="overlay__title">
            <FileSpreadsheet size={25} />
            <h2>Generate practice tests</h2>
          </div>
          <button className="ghost-icon" type="button" onClick={onClose} aria-label="Close modal">
            <X size={26} />
          </button>
        </header>

        <div className="overlay__body">
          <h3>Generate a practice test</h3>
          <p>
            Subject scoped: <strong>{selectedSubject.name}</strong>. Choose or upload materials to generate
            questions from this subject only.
          </p>

          <div className="tab-row">
            {(Object.keys(tabLabels) as PracticeSourceTab[]).map((key) => (
              <button
                className={`tab-button ${tab === key ? "active" : ""}`}
                key={key}
                type="button"
                onClick={() => setTab(key)}
              >
                {tabLabels[key]}
              </button>
            ))}
          </div>

          {tab === "upload" ? (
            <div className="upload-card">
              <div className="upload-icons">
                <FileText size={45} />
                <Upload size={45} />
              </div>
              <h4>Drag and drop notes, readings, lecture slides, etc.</h4>
              <p>Supported file types are .docx, .pdf, .pptx</p>
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                Browse files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg"
                onChange={onFilesSelected}
                hidden
              />
              {selectedFiles.length ? (
                <div className="file-chip-row">
                  {selectedFiles.map((file) => (
                    <span className="file-chip" key={file.name}>
                      {file.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "paste" ? (
            <textarea
              className="text-area"
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder="Paste your notes here. We'll do the rest."
            />
          ) : null}

          {tab === "drive" ? (
            <div className="upload-card upload-card--small">
              <Globe size={48} />
              <h4>Connect Google Drive to import your notes.</h4>
              <button
                type="button"
                onClick={() => {
                  setDriveConnected(true);
                  onGenerated("Google Drive connected (mock). You can now generate.");
                }}
              >
                {driveConnected ? "Drive connected" : "Connect Drive"}
              </button>
            </div>
          ) : null}

          {tab === "flashcards" ? (
            <div className="upload-card upload-card--small">
              <h4>Use existing flashcard sets as practice material.</h4>
              <button
                type="button"
                onClick={() => {
                  setFlashcardsSelected(true);
                  onGenerated("Flashcard set selected for practice generation.");
                }}
              >
                {flashcardsSelected ? "Flashcard set selected" : "Choose flashcard sets"}
              </button>
            </div>
          ) : null}
        </div>

        <footer className="overlay__footer">
          <p>
            This product is enhanced using AI and may provide incorrect or problematic content. Do not enter
            any personal data.
          </p>
          <button type="button" disabled={!canGenerate || generating} onClick={onGenerate}>
            {generating ? "Generating..." : "Generate"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default StudyMode;
