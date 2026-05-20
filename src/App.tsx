import { useEffect, useRef, useState } from "react";
import { Graph } from "./components/Graph";
import { Uploader } from "./components/Uploader";
import { Stats } from "./components/Stats";
import type { GraphData } from "./types";
import "./App.css";

interface WorkerResult {
  success: boolean;
  data?: GraphData;
  error?: string;
}

function App() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL("./parser.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleParse = (content: string, name: string) => {
    const worker = workerRef.current;
    if (!worker) return;

    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    setFileName(name);

    const onMessage = (event: MessageEvent<WorkerResult>) => {
      if (reqId !== reqIdRef.current) return; // stale parse, ignore
      worker.removeEventListener("message", onMessage);
      if (event.data.success && event.data.data) {
        setGraphData(event.data.data);
      } else {
        setError(event.data.error || "Failed to parse plan");
      }
      setLoading(false);
    };
    worker.addEventListener("message", onMessage);

    try {
      worker.postMessage(content);
    } catch (err) {
      worker.removeEventListener("message", onMessage);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  const handleSampleSelected = async (sampleName: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.BASE_URL}${sampleName}.json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load sample (${response.status})`);
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
        onFileSelected={handleParse}
        onSampleSelected={handleSampleSelected}
        loading={loading}
        error={error}
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
          <button onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
    </div>
  );
}

export default App;
