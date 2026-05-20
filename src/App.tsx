import { useState, useRef } from "react";
import { Graph } from "./components/Graph";
import { Uploader } from "./components/Uploader";
import { Stats } from "./components/Stats";
import type { GraphData } from "./types";
import "./App.css";

function App() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const initWorker = () => {
    if (workerRef.current) return;
    workerRef.current = new Worker(
      new URL("./parser.worker.ts", import.meta.url),
      { type: "module" }
    );
  };

  const handleParse = (content: string, name: string) => {
    initWorker();
    setLoading(true);
    setError(null);
    setFileName(name);

    workerRef.current!.onmessage = (
      event: MessageEvent<{
        success: boolean;
        data?: GraphData;
        error?: string;
      }>
    ) => {
      if (event.data.success && event.data.data) {
        setGraphData(event.data.data);
      } else {
        setError(event.data.error || "Failed to parse plan");
      }
      setLoading(false);
    };

    workerRef.current!.onerror = (error: ErrorEvent) => {
      setError(error.message || "Worker error");
      setLoading(false);
    };

    try {
      workerRef.current!.postMessage(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  const handleFileSelected = (content: string, name: string) => {
    handleParse(content, name);
  };

  const handleSampleSelected = async (sampleName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/${sampleName}.json`);
      if (!response.ok) throw new Error("Failed to load sample");
      const content = await response.text();
      handleParse(content, `${sampleName}.json`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sample");
      setLoading(false);
    }
  };

  const handleReset = () => {
    setGraphData(null);
    setFileName(null);
    setError(null);
  };

  if (!graphData) {
    return (
      <Uploader
        onFileSelected={handleFileSelected}
        onSampleSelected={handleSampleSelected}
        loading={loading}
        fileName={fileName || undefined}
      />
    );
  }

  return (
    <div className="app-container">
      <Stats data={graphData} onReset={handleReset} />
      <Graph data={graphData} />
      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

export default App;
