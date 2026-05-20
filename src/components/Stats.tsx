import type { GraphData, ResourceAction } from "../types";
import "./Stats.css";

interface StatsProps {
  data: GraphData;
  onReset: () => void;
}

const STAT_ACTIONS: Array<{ key: ResourceAction; label: string }> = [
  { key: "create", label: "Creating" },
  { key: "update", label: "Updating" },
  { key: "delete", label: "Deleting" },
  { key: "replace", label: "Replacing" },
];

export function Stats({ data, onReset }: StatsProps) {
  const totalResources = data.nodes.length;
  const totalDependencies = data.edges.length;

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <h2>Plan analysis</h2>
        <button className="reset-button" onClick={onReset}>← Back</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalResources}</div>
          <div className="stat-label">Resources</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalDependencies}</div>
          <div className="stat-label">Dependencies</div>
        </div>
        {STAT_ACTIONS.map(({ key, label }) => {
          const count = data.actionCounts[key] ?? 0;
          if (count === 0) return null;
          return (
            <div key={key} className="stat-card">
              <div className="stat-value">{count}</div>
              <div className="stat-label">{label}</div>
              <div className={`stat-badge ${key}`}>
                {Math.round((count / totalResources) * 100)}%
              </div>
            </div>
          );
        })}
        <div className="stat-card">
          <div className="stat-value">{Object.keys(data.resourceCount).length}</div>
          <div className="stat-label">Resource types</div>
        </div>
      </div>

      {data.cycles.length > 0 && (
        <div className="warning-section">
          <div className="warning-icon">⚠️</div>
          <div>
            <h3>Dependency cycles detected</h3>
            <p>
              Found {data.cycles.length} cycle{data.cycles.length === 1 ? "" : "s"} —
              Terraform will refuse to apply this plan until they're resolved.
            </p>
          </div>
        </div>
      )}

      {Object.keys(data.resourceCount).length > 0 && (
        <div className="resource-types">
          <h3>Resource types</h3>
          <div className="types-list">
            {Object.entries(data.resourceCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([type, count]) => (
                <div key={type} className="type-item">
                  <span className="type-name">{type}</span>
                  <span className="type-count">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {data.criticalPath.length > 1 && (
        <div className="critical-path">
          <h3>Critical path</h3>
          <p className="path-description">
            Longest dependency chain — {data.criticalPath.length} resources deep.
          </p>
          <div className="path-list">
            {data.criticalPath.map((resourceId, idx) => (
              <div key={resourceId} className="path-item">
                <div className="path-number">{idx + 1}</div>
                <div className="path-resource">{resourceId}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
