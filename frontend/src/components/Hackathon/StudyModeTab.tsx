import { useState } from "react";
import { BookOpen, CheckCircle, RefreshCcw, FileText, CheckCircle2 } from "lucide-react";
import { studyApi, StudyTestResponse } from "../../api/studyApi";

interface StudyModeTabProps {
    subjectId: string;
    subjectName: string;
}

export const StudyModeTab = ({ subjectId, subjectName }: StudyModeTabProps) => {
    const [testData, setTestData] = useState<StudyTestResponse | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const generated = await studyApi.generatePracticeTest(subjectId);
            setTestData(generated);
        } catch (err) {
            console.error(err);
            setError("Failed to generate study materials.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!testData) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
                    <BookOpen size={32} className="text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Subject-Scoped Study Mode</h3>
                <p className="text-neutral-400 max-w-md mb-8">
                    Generate an intelligent practice exam exclusively derived from your uploaded notes for {subjectName}.
                    Includes 5 Multiple Choice and 3 Short Answer questions.
                </p>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 group disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <RefreshCcw size={20} className="animate-spin" />
                            Generating Test...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={20} className="group-hover:scale-110 transition-transform" />
                            Generate Study Material
                        </>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-8 relative">
            <div className="max-w-3xl mx-auto pb-20">
                <div className="flex items-center justify-between font-bold mb-8 pb-4 border-b border-neutral-800">
                    <h2 className="text-2xl text-white">Practice Test: {subjectName}</h2>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <RefreshCcw size={16} className={isGenerating ? "animate-spin" : ""} />
                        Regenerate
                    </button>
                </div>

                <div className="space-y-10">
                    {/* MCQs Section */}
                    <div>
                        <h3 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2">
                            <CheckCircle2 size={24} /> Multiple Choice Section
                        </h3>
                        <div className="space-y-6">
                            {testData.mcqs.map((q, index) => (
                                <div key={index} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-sm">
                                    <div className="flex gap-4">
                                        <span className="text-blue-500 font-bold text-lg select-none">Q{index + 1}.</span>
                                        <div className="flex-1 space-y-4">
                                            <p className="text-lg text-neutral-100 font-medium">{q.question}</p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                                {q.options.map((opt, i) => (
                                                    <div key={i} className={`p-4 rounded-lg border ${i === q.correctOptionIndex ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-100" : "bg-neutral-950 border-neutral-800 text-neutral-400"}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded-full border flex-shrink-0 ${i === q.correctOptionIndex ? "border-emerald-500 bg-emerald-500/20" : "border-neutral-700"}`} />
                                                            <span>{opt}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
                                                <div className="text-sm text-neutral-300">
                                                    <span className="font-bold text-blue-400 mr-2">Explanation:</span>
                                                    {q.explanation}
                                                </div>
                                                <div className="text-xs flex items-center gap-1.5 text-neutral-500 bg-neutral-950 w-max px-2 py-1 rounded">
                                                    <FileText size={12} />
                                                    Citation: [{q.sourceChunkId}]
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SAQs Section */}
                    <div>
                        <h3 className="text-xl font-bold text-indigo-400 mb-6 flex items-center gap-2 pt-6 border-t border-neutral-800">
                            <BookOpen size={24} /> Short Answer Section
                        </h3>
                        <div className="space-y-6">
                            {testData.saqs.map((q, index) => (
                                <div key={index} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-sm border-l-4 border-l-indigo-500">
                                    <div className="flex gap-4">
                                        <span className="text-indigo-400 font-bold text-lg select-none">S{index + 1}.</span>
                                        <div className="flex-1 space-y-4">
                                            <p className="text-lg text-neutral-100 font-medium">{q.question}</p>

                                            <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 mt-4">
                                                <div className="text-xs text-indigo-500/70 font-bold mb-2 uppercase flex items-center gap-1.5">
                                                    Model Answer
                                                </div>
                                                <p className="text-neutral-200">{q.modelAnswer}</p>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-neutral-800">
                                                <div className="text-xs flex items-center gap-1.5 text-neutral-500 bg-neutral-950 w-max px-2 py-1 rounded">
                                                    <FileText size={12} />
                                                    Citation: [{q.sourceChunkId}]
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
