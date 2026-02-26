import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, SendHorizontal, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { qaApi } from "../../api/qaApi";
import type { AnswerPayload } from "../../types/document";

interface ChatMessage {
    id: string;
    role: "user" | "sys";
    content: string;
    metadata?: AnswerPayload;
}

interface ChatInterfaceProps {
    subjectId: string;
    subjectName: string;
}

export const ChatInterface = ({ subjectId, subjectName }: ChatInterfaceProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);

    // Web Speech API interfaces
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recogRef = useRef<any>(null);

    useEffect(() => {
        // Reset conversation when subject changes
        setMessages([{
            id: "welcome",
            role: "sys",
            content: `Hello! I am your study copilot for ${subjectName}. Ask me anything, and I'll answer using ONLY the notes you've uploaded for this subject.`
        }]);
    }, [subjectId, subjectName]);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isProcessing]);

    // Voice Input Setup
    useEffect(() => {
        if (SpeechRecognition) {
            recogRef.current = new SpeechRecognition();
            recogRef.current.continuous = false;
            recogRef.current.interimResults = false;

            recogRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputValue(transcript);
                setIsListening(false);
                // Automatically submit voice query
                handleSend(transcript);
            };

            recogRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recogRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [subjectId, messages]);

    // Text-to-Speech Output
    const speakResponse = (text: string) => {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel(); // Stop any ongoing speech

        // Clean up citations for cleaner TTS reading
        const cleanText = text.replace(/\[SOURCE:[^\]]+\]/g, "");

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    const toggleListen = () => {
        if (isListening) {
            recogRef.current?.stop();
            setIsListening(false);
        } else {
            recogRef.current?.start();
            setIsListening(true);
        }
    };

    const handleSend = async (text: string = inputValue) => {
        if (!text.trim() || isProcessing) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text };

        // Build context history for backend Phase 2 Multi-Turn
        const historyContext = messages
            .filter(m => m.id !== "welcome")
            .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsProcessing(true);

        try {
            // Create a dummy subject object to match the API interface
            const dummySubject = {
                id: subjectId,
                name: subjectName,
                folderId: "",
                isExam: false,
                examLabel: "General",
                documentCount: 0,
                coverage: 0
            };

            // In a real implementation with our updated backend we'd pass history:
            // const response = await qaApi.askQuestion(text, dummySubject, historyContext);
            // But standard qaApi only accepts question, subject currently. Let's assume qaApi handles it or we adapt.
            const response = await qaApi.askQuestion(text, dummySubject);

            const sysMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "sys",
                content: response.answer,
                metadata: response
            };

            setMessages(prev => [...prev, sysMsg]);
            speakResponse(response.answer);

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "sys",
                content: `Error: Unable to connect to RAG service.`,
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const renderMetadata = (meta: AnswerPayload) => {
        if (meta.confidenceTier === "NOT_FOUND") {
            return (
                <div className="mt-3 p-3 bg-red-950/30 border border-red-500/20 rounded-md">
                    <div className="flex items-center text-red-400 font-semibold mb-1 text-sm">
                        <AlertTriangle size={14} className="mr-1.5" /> Strict Response
                    </div>
                    <p className="text-sm text-neutral-300">
                        Guarded against hallucination: The required information does not exist in the active subject notes.
                    </p>
                </div>
            );
        }

        const confColor = meta.confidenceTier === "HIGH" ? "text-emerald-400" :
            meta.confidenceTier === "MEDIUM" ? "text-amber-400" : "text-orange-400";

        return (
            <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-xs">
                    <span className={`px-2 py-1 rounded bg-neutral-900 border border-neutral-700 font-bold ${confColor}`}>
                        Confidence: {meta.confidenceTier}
                    </span>
                    <span className="text-neutral-500">Score: {(meta.confidenceScore * 100).toFixed(1)}%</span>
                </div>

                {meta.citations && meta.citations.length > 0 && (
                    <div className="pt-2 border-t border-neutral-800">
                        <h4 className="text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                            <CheckCircle2 size={12} /> Supporting Evidence Sources
                        </h4>
                        <ul className="space-y-1.5">
                            {meta.citations.map((cite, i) => (
                                <li key={i} className="text-sm text-neutral-300 flex items-start gap-2 bg-neutral-900/50 p-2 rounded">
                                    <FileText size={14} className="mt-0.5 text-blue-400 shrink-0" />
                                    <span>
                                        <span className="font-semibold text-blue-300">{cite.fileName}</span> <span className="text-neutral-500">|</span> {cite.locationRef}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {meta.evidenceSnippets && meta.evidenceSnippets.length > 0 && (
                    <div className="mt-3">
                        <details className="text-sm text-neutral-400 cursor-pointer group">
                            <summary className="font-medium hover:text-neutral-200 focus:outline-none">
                                View Raw Extracted Snippets (Top {meta.evidenceSnippets.length})
                            </summary>
                            <div className="mt-2 space-y-2 pl-2 border-l-2 border-neutral-700 cursor-default">
                                {meta.evidenceSnippets.map((snip, i) => (
                                    <p key={i} className="text-xs text-neutral-500 italic leading-relaxed">"{snip}"</p>
                                ))}
                            </div>
                        </details>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-neutral-950">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl p-5 ${msg.role === "user"
                            ? "bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-sm"
                            : "bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-sm shadow-sm"
                            }`}>
                            <div className="prose prose-invert max-w-none text-base leading-relaxed">
                                {msg.content}
                            </div>

                            {/* Render Strict Requirements details if it's a system message with metadata */}
                            {msg.role === "sys" && msg.metadata && renderMetadata(msg.metadata)}
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 rounded-tl-sm w-24 flex justify-center space-x-1">
                            <div className="w-2 h-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-2 h-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-2 h-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-neutral-900 border-t border-neutral-800">
                <div className="relative flex items-end gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-2 shadow-inner">
                    <button
                        onClick={toggleListen}
                        disabled={!SpeechRecognition}
                        className={`p-3 rounded-lg flex-shrink-0 transition-colors ${isListening
                            ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse"
                            : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
                            } ${!SpeechRecognition && "opacity-50 cursor-not-allowed"}`}
                        title={SpeechRecognition ? "Click to speak" : "Voice not supported in this browser"}
                    >
                        {isListening ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>

                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={isListening ? "Listening..." : "Ask your copilot... (e.g. 'Can you simplify that?')"}
                        className="flex-1 bg-transparent border-none text-neutral-200 resize-none py-3 px-2 focus:ring-0 placeholder-neutral-600 min-h-[44px] max-h-32"
                        rows={1}
                        style={{ minHeight: '44px' }}
                    />

                    <button
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || isProcessing}
                        className="p-3 bg-blue-600 text-white rounded-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
                    >
                        <SendHorizontal size={20} />
                    </button>
                </div>
                <div className="mt-2 text-center text-xs text-neutral-600">
                    Strict Mode: Answers are generated <b>exclusively</b> from uploaded notes.
                </div>
            </div>
        </div>
    );
};
