import { Mic, MicOff, SendHorizonal } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { qaApi } from "../api/qaApi";
import { useSubject } from "../hooks/useSubject";
import type { AnswerPayload } from "../types/document";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  payload?: AnswerPayload;
}

const ChatInterface = () => {
  const { selectedSubject } = useSubject();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sttError, setSttError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-seed",
      role: "assistant",
      text: `Ask any question from ${selectedSubject.name}. Answers are scoped only to your uploaded notes.`
    }
  ]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceQueryRef = useRef("");
  const loadingRef = useRef(false);
  const speechRecognitionSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      (typeof window.SpeechRecognition !== "undefined" ||
        typeof window.webkitSpeechRecognition !== "undefined"),
    []
  );

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(
    () => () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    },
    []
  );

  const submitQuestionText = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) {
      return;
    }

    setLoading(true);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: trimmed }
    ]);
    setPrompt("");

    try {
      const answer = await qaApi.askQuestion(trimmed, selectedSubject);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: answer.answer,
          payload: answer
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: "I could not process that question right now. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault();
    await submitQuestionText(prompt);
  };

  const toggleVoiceInput = () => {
    if (!speechRecognitionSupported || loading) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionCtor = (
      window.SpeechRecognition ?? window.webkitSpeechRecognition
    ) as (new () => SpeechRecognition) | undefined;

    if (!SpeechRecognitionCtor) {
      setSttError("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setSttError("");
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0]?.transcript?.trim() ?? "";
        if (!text) {
          continue;
        }

        if (event.results[index].isFinal) {
          finalChunk = `${finalChunk} ${text}`.trim();
        } else {
          interimChunk = `${interimChunk} ${text}`.trim();
        }
      }

      if (finalChunk) {
        voiceQueryRef.current = `${voiceQueryRef.current} ${finalChunk}`.trim();
      }

      setPrompt(`${voiceQueryRef.current} ${interimChunk}`.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setSttError("Microphone permission denied.");
        return;
      }
      if (event.error === "no-speech") {
        setSttError("No speech detected. Try again.");
        return;
      }
      setSttError("Voice capture failed. Please retry.");
    };

    recognition.onend = async () => {
      setIsListening(false);
      const spokenQuestion = voiceQueryRef.current.trim();
      voiceQueryRef.current = "";

      if (spokenQuestion && !loadingRef.current) {
        await submitQuestionText(spokenQuestion);
      }
    };

    recognitionRef.current = recognition;

    try {
      setPrompt("");
      setSttError("");
      voiceQueryRef.current = "";
      recognition.start();
    } catch {
      setSttError("Microphone is busy. Please try again.");
    }
  };

  return (
    <section className="panel chat-panel">
      <div className="panel-title-row">
        <h2>Subject-scoped Q&A</h2>
        <span className="pill">{selectedSubject.name}</span>
      </div>
      {!speechRecognitionSupported ? (
        <p className="chat-status chat-status--error">Voice input is not supported in this browser.</p>
      ) : null}
      {isListening ? <p className="chat-status">Listening... speak your question.</p> : null}
      {sttError ? <p className="chat-status chat-status--error">{sttError}</p> : null}

      <div className="chat-list">
        {messages.map((message) => (
          <article className={`chat-bubble chat-bubble--${message.role}`} key={message.id}>
            <p>{message.text}</p>
            {message.payload?.citations?.length ? (
              <footer>
                <strong>{message.payload.confidence}</strong>
                {message.payload.citations.map((citation) => (
                  <span key={`${message.id}-${citation.location}`}>
                    {citation.documentName} • {citation.location}
                  </span>
                ))}
              </footer>
            ) : null}
          </article>
        ))}
      </div>

      <form className="chat-input-row" onSubmit={submitQuestion}>
        <button
          type="button"
          onClick={toggleVoiceInput}
          disabled={!speechRecognitionSupported || loading}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
          className={`chat-voice-button ${isListening ? "is-listening" : ""}`}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          {isListening ? "Stop" : "Speak"}
        </button>
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask from your notes only..."
          aria-label="Ask question"
        />
        <button type="submit" disabled={loading}>
          <SendHorizonal size={18} />
          {loading ? "Checking..." : "Ask"}
        </button>
      </form>
    </section>
  );
};

export default ChatInterface;
