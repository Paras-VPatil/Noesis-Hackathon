import { Mic, MicOff, SendHorizonal, Volume2, VolumeX } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { qaApi } from "../api/qaApi";
import { useSubject } from "../hooks/useSubject";
import type { AnswerPayload, Citation } from "../types/document";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  payload?: AnswerPayload;
}

const buildSeedMessage = (subjectName: string): ChatMessage => ({
  id: "assistant-seed",
  role: "assistant",
  text: `Ask any question from ${subjectName}. Answers are scoped only to your uploaded notes.`
});

const getConfidenceLabel = (payload?: AnswerPayload) =>
  payload?.confidenceTier ?? payload?.confidence ?? "NOT_FOUND";

const getCitationText = (citation: Citation) => ({
  document: citation.documentName ?? citation.fileName ?? "Unknown source",
  location: citation.location ?? citation.locationRef ?? "Unknown location"
});

const buildSpeechText = (message: ChatMessage) => {
  const confidence = getConfidenceLabel(message.payload);
  const citations = (message.payload?.citations ?? []).slice(0, 3).map((citation, index) => {
    const label = getCitationText(citation);
    return `Source ${index + 1}: ${label.document}, ${label.location}.`;
  });

  const citationSummary = citations.length ? citations.join(" ") : "No source citations available.";
  return `${message.text} Confidence level: ${confidence}. ${citationSummary}`;
};

const ChatInterface = () => {
  const { selectedSubject } = useSubject();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isListening, setIsListening] = useState(false);
  const [sttError, setSttError] = useState("");
  const [ttsError, setTtsError] = useState("");
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([buildSeedMessage(selectedSubject.name)]);

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

  const speechSynthesisSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof SpeechSynthesisUtterance !== "undefined" &&
      "speechSynthesis" in window,
    []
  );

  const stopSpeech = () => {
    if (!speechSynthesisSupported) {
      return;
    }
    window.speechSynthesis.cancel();
    setActiveSpeechMessageId(null);
  };

  const startSpeech = (message: ChatMessage) => {
    if (!speechSynthesisSupported) {
      setTtsError("Voice output is not supported in this browser.");
      return;
    }

    stopSpeech();
    setTtsError("");

    const utterance = new SpeechSynthesisUtterance(buildSpeechText(message));
    utterance.lang = "en-US";
    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    utterance.onend = () => setActiveSpeechMessageId(null);
    utterance.onerror = () => {
      setActiveSpeechMessageId(null);
      setTtsError("Audio playback failed. Try again.");
    };

    setActiveSpeechMessageId(message.id);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(
    () => () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopSpeech();
    },
    []
  );

  useEffect(() => {
    setSessionId(undefined);
    setPrompt("");
    setSttError("");
    setTtsError("");
    setIsListening(false);
    voiceQueryRef.current = "";
    recognitionRef.current?.stop();
    stopSpeech();
    setMessages([buildSeedMessage(selectedSubject.name)]);
  }, [selectedSubject.id, selectedSubject.name]);

  const submitQuestionText = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) {
      return;
    }

    stopSpeech();
    setLoading(true);
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: trimmed }]);
    setPrompt("");

    try {
      const answer = await qaApi.askQuestion(trimmed, selectedSubject, sessionId);
      if (answer.sessionId) {
        setSessionId(answer.sessionId);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: answer.answer,
        payload: answer
      };

      setMessages((current) => [...current, assistantMessage]);

      if (speechSynthesisSupported) {
        startSpeech(assistantMessage);
      }
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

  const toggleSpeechForMessage = (message: ChatMessage) => {
    if (!message.payload) {
      return;
    }
    if (activeSpeechMessageId === message.id) {
      stopSpeech();
      return;
    }
    startSpeech(message);
  };

  return (
    <section className="panel chat-panel">
      <div className="panel-title-row">
        <h2>Subject-scoped Q&A</h2>
        <span className="pill">{selectedSubject.name}</span>
      </div>
      {sessionId ? <p className="chat-status">Session active: {sessionId}</p> : null}
      {!speechRecognitionSupported ? (
        <p className="chat-status chat-status--error">Voice input is not supported in this browser.</p>
      ) : null}
      {!speechSynthesisSupported ? (
        <p className="chat-status chat-status--error">Voice output is not supported in this browser.</p>
      ) : null}
      {isListening ? <p className="chat-status">Listening... speak your question.</p> : null}
      {sttError ? <p className="chat-status chat-status--error">{sttError}</p> : null}
      {ttsError ? <p className="chat-status chat-status--error">{ttsError}</p> : null}

      <div className="chat-list">
        {messages.map((message) => (
          <article className={`chat-bubble chat-bubble--${message.role}`} key={message.id}>
            <p>{message.text}</p>
            {message.role === "assistant" && message.payload ? (
              <footer>
                <div className="chat-bubble-actions">
                  <button
                    type="button"
                    onClick={() => toggleSpeechForMessage(message)}
                    disabled={!speechSynthesisSupported}
                  >
                    {activeSpeechMessageId === message.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {activeSpeechMessageId === message.id ? "Stop audio" : "Play audio"}
                  </button>
                </div>
                <strong>{getConfidenceLabel(message.payload)}</strong>
                {(message.payload.citations ?? []).map((citation, index) => {
                  const label = getCitationText(citation);
                  return (
                    <span key={`${message.id}-${label.document}-${label.location}-${index}`}>
                      {label.document} - {label.location}
                    </span>
                  );
                })}
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
