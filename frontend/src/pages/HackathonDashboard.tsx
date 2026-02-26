import { useState } from "react";
import { Upload, MessageSquare, BookOpen } from "lucide-react";
import { ChatInterface } from "../components/Hackathon/ChatInterface";
import { StudyModeTab } from "../components/Hackathon/StudyModeTab";

// Mock subjects to fulfill the 'exactly 3 subjects' requirement
const FIXED_SUBJECTS = [
    { id: "physics", name: "Physics" },
    { id: "chemistry", name: "Chemistry" },
    { id: "maths", name: "Maths" },
];

const HackathonDashboard = () => {
    const [activeSubjectId, setActiveSubjectId] = useState<string>(FIXED_SUBJECTS[0].id);
    const [activeTab, setActiveTab] = useState<"chat" | "study">("chat");
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const activeSubject = FIXED_SUBJECTS.find((s) => s.id === activeSubjectId)!;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            const newFiles = Array.from(e.target.files);

            // Simulate upload delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            setFiles([...files, ...newFiles]);
            setIsUploading(false);
        }
    };

    return (
        <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans">
            {/* 1. Three-Subject Sidebar */}
            <aside className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                        AskMyNotes
                    </h1>
                    <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">Phase 1 & 2 Prototype</p>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {FIXED_SUBJECTS.map((subject) => (
                        <button
                            key={subject.id}
                            onClick={() => setActiveSubjectId(subject.id)}
                            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${activeSubjectId === subject.id
                                ? "bg-blue-600/10 text-blue-400 border border-blue-500/30"
                                : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full mr-3 ${activeSubjectId === subject.id ? "bg-blue-500" : "bg-neutral-600"}`} />
                            <span className="font-medium">{subject.name}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 text-xs text-neutral-600 text-center border-t border-neutral-800">
                    Strict Subject-Scoped Mode Active
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Header & Upload Zone */}
                <header className="h-20 border-b border-neutral-800 bg-neutral-900 flex items-center px-8 shrink-0">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white shrink-0">{activeSubject.name} Workspace</h2>
                        <p className="text-sm text-neutral-400 shrink-0">Upload notes and study exactly what you need.</p>
                    </div>

                    <div className="shrink-0 flex items-center">
                        <label className={`cursor-pointer bg-neutral-800 text-neutral-200 px-4 py-2 rounded-lg border border-neutral-700 flex items-center gap-2 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-700'}`}>
                            {isUploading ? <span className="animate-spin text-blue-400">↻</span> : <Upload size={16} />}
                            <span className="text-sm font-medium">{isUploading ? 'Uploading...' : 'Upload Notes (PDF/TXT)'}</span>
                            <input type="file" multiple accept=".pdf,.txt" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                        </label>
                        {!isUploading && files.length > 0 && (
                            <span className="ml-3 text-sm text-emerald-400 font-medium flex items-center">
                                ✓ {files.length} file(s) indexed
                            </span>
                        )}
                    </div>
                </header>

                {/* Mode Toggle */}
                <div className="px-8 pt-6 pb-2 shrink-0">
                    <div className="flex p-1 bg-neutral-950 rounded-lg w-max border border-neutral-800">
                        <button
                            onClick={() => setActiveTab("chat")}
                            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === "chat" ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-300"
                                }`}
                        >
                            <MessageSquare size={16} />
                            Teacher Chat (Q&A)
                        </button>
                        <button
                            onClick={() => setActiveTab("study")}
                            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === "study" ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-300"
                                }`}
                        >
                            <BookOpen size={16} />
                            Study Mode
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden relative">
                    {activeTab === "chat" ? (
                        <ChatInterface subjectId={activeSubjectId} subjectName={activeSubject.name} />
                    ) : (
                        <StudyModeTab subjectId={activeSubjectId} subjectName={activeSubject.name} />
                    )}
                </div>
            </main>
        </div>
    );
};

export default HackathonDashboard;
