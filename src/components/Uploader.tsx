import { useRef } from "react";
import "./Uploader.css";

interface UploaderProps {
  onFileSelected: (content: string, filename: string) => void;
  onSampleSelected: (sampleName: string) => void;
  loading: boolean;
  error?: string | null;
  fileName?: string;
}

export function Uploader({
  onFileSelected,
  onSampleSelected,
  loading,
  error,
  fileName,
}: UploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    onFileSelected(content, file.name);
  };

  return (
    <div className="uploader">
      <div className="uploader-header">
        <h1>Terraform Plan Graph Explorer</h1>
        <p>Visualize your Terraform plans as interactive dependency graphs</p>
      </div>

      <div className="uploader-content">
        {fileName && (
          <div className="file-loaded">
            <div className="check-icon">✓</div>
            <div>
              <p className="loaded-text">Plan loaded:</p>
              <p className="file-name">{fileName}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="upload-error" role="alert">
            {error}
          </div>
        )}

        <div className="upload-section">
          <div className="upload-area">
            <div className="upload-icon">📄</div>
            <h2>Upload Terraform Plan</h2>
            <p>
              Generate one with <code>terraform show -json tfplan</code>, then drop
              the resulting JSON here.
            </p>
            <button
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              {loading ? "Parsing…" : "Select file"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={loading}
            />
          </div>

          <div className="divider">OR</div>

          <div className="samples-section">
            <h3>Try a sample</h3>
            <div className="samples-grid">
              <button
                className="sample-button"
                onClick={() => onSampleSelected("sample-vpc")}
                disabled={loading}
              >
                <span className="sample-icon">🌐</span>
                <span className="sample-name">VPC + ALB</span>
              </button>
              <button
                className="sample-button"
                onClick={() => onSampleSelected("sample-app-stack")}
                disabled={loading}
              >
                <span className="sample-icon">⚙️</span>
                <span className="sample-name">App stack</span>
              </button>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h3>How it works</h3>
          <ul>
            <li>
              <strong>Parse:</strong> The plan JSON is parsed in a Web Worker so
              the UI stays responsive on large plans.
            </li>
            <li>
              <strong>Visualize:</strong> Each <code>resource_changes</code> entry
              becomes a node; references in <code>configuration</code> become
              edges.
            </li>
            <li>
              <strong>Analyze:</strong> Click a node to highlight everything it
              depends on and everything that depends on it.
            </li>
            <li>
              <strong>Detect:</strong> Cycles flagged automatically; longest
              dependency chain shown as the critical path.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
