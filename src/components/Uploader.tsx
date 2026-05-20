import { useRef } from "react";
import "./Uploader.css";

interface UploaderProps {
  onFileSelected: (content: string, filename: string) => void;
  onSampleSelected: (sampleName: string) => void;
  loading: boolean;
  fileName?: string;
}

export function Uploader({
  onFileSelected,
  onSampleSelected,
  loading,
  fileName,
}: UploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onFileSelected(content, file.name);
    };
    reader.readAsText(file);
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

        <div className="upload-section">
          <div className="upload-area">
            <div className="upload-icon">📄</div>
            <h2>Upload Terraform Plan</h2>
            <p>Drag and drop your plan.json file or click to browse</p>
            <button
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              {loading ? "Parsing..." : "Select File"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={loading}
            />
          </div>

          <div className="divider">OR</div>

          <div className="samples-section">
            <h3>Try a Sample</h3>
            <div className="samples-grid">
              <button
                className="sample-button"
                onClick={() => onSampleSelected("sample-vpc")}
                disabled={loading}
              >
                <span className="sample-icon">🌐</span>
                <span className="sample-name">VPC Setup</span>
              </button>
              <button
                className="sample-button"
                onClick={() => onSampleSelected("sample-app-stack")}
                disabled={loading}
              >
                <span className="sample-icon">⚙️</span>
                <span className="sample-name">App Stack</span>
              </button>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h3>How it works</h3>
          <ul>
            <li>
              <strong>Parse:</strong> Upload a Terraform plan JSON file or use
              a sample
            </li>
            <li>
              <strong>Visualize:</strong> See resource dependencies as an
              interactive graph
            </li>
            <li>
              <strong>Analyze:</strong> Click nodes to see details and
              dependencies
            </li>
            <li>
              <strong>Plan:</strong> Understand change impact and apply order
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
