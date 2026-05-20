import type { GraphData } from "../types";
import "./Stats.css";

interface StatsProps {
  data: GraphData;
  onReset: () => void;
}

export function Stats({ data, onReset }: StatsProps) {
  const totalResources = data.nodes.length;
  const totalDependencies = data.edges.length;

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <h2>Plan Analysis</h2>
        <button className="reset-button" onClick={onReset}>
          ← Back
        </button>
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
        <div className="stat-card">
          <div className="stat-value">{data.actionCounts["create"] || 0}</div>
          <div className="stat-label">Creating</div>
          <div className="stat-badge create">
            {Math.round(
              ((data.actionCounts["create"] || 0) / totalResources) * 100
            )}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.actionCounts["update"] || 0}</div>
          <div className="stat-label">Updating</div>
          <div className="stat-badge update">
            {Math.round(
              ((data.actionCounts["update"] || 0) / totalResources) * 100
            )}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.actionCounts["delete"] || 0}</div>
          <div className="stat-label">Deleting</div>
          <div className="stat-badge delete">
            {Math.round(
              ((data.actionCounts["delete"] || 0) / totalResources) * 100
            )}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {Object.keys(data.resourceCount).length}
          </div>
          <div className="stat-label">Resource Types</div>
        </div>
      </div>

      {data.cycles.length > 0 && (
        <div className="warning-section">
          <div className="warning-icon">⚠️</div>
          <div>
            <h3>Dependency Cycles Detected</h3>
            <p>
              Your plan contains {data.cycles.length} circular dependencies that
              will prevent Terraform from applying this plan.
            </p>
          </div>
        </div>
      )}

      {data.resourceCount && (
        <div className="resource-types">
          <h3>Resource Types</h3>
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

      {data.criticalPath.length > 0 && (
        <div className="critical-path">
          <h3>Critical Path</h3>
          <p className="path-description">
            Longest dependency chain ({data.criticalPath.length} resources)
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
