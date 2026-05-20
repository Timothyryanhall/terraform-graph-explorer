import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import type { Core, EventObject, NodeSingular } from "cytoscape";
import type { GraphData, GraphNode, ResourceAction } from "../types";
import "./Graph.css";

interface GraphProps {
  data: GraphData;
}

export const ACTION_COLORS: Record<ResourceAction, string> = {
  create: "#10b981",
  update: "#f59e0b",
  delete: "#ef4444",
  replace: "#a855f7",
  read: "#6b7280",
  "no-op": "#94a3b8",
};

export function Graph({ data }: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...data.nodes.map((n) => ({
          data: { id: n.id, label: n.address, action: n.action },
        })),
        ...data.edges.map((e) => ({
          data: { id: `${e.source}->${e.target}`, source: e.source, target: e.target },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele: NodeSingular) =>
              ACTION_COLORS[ele.data("action") as ResourceAction] ?? ACTION_COLORS["no-op"],
            label: "data(label)",
            "font-size": "11px",
            "text-valign": "center",
            "text-halign": "center",
            color: "#fff",
            "text-outline-color": "#0f172a",
            "text-outline-width": 1,
            width: 80,
            height: 80,
          },
        },
        {
          selector: "node.faded",
          style: { opacity: 0.2 },
        },
        {
          selector: "node:selected",
          style: { "border-width": 4, "border-color": "#0f172a" },
        },
        {
          selector: "edge",
          style: {
            "line-color": "#cbd5e1",
            width: 2,
            "target-arrow-color": "#cbd5e1",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
        {
          selector: "edge.faded",
          style: { opacity: 0.1 },
        },
        {
          selector: "edge.highlighted",
          style: {
            "line-color": "#3b82f6",
            width: 3,
            "target-arrow-color": "#3b82f6",
          },
        },
      ],
      layout: {
        name: "breadthfirst",
        directed: true,
        padding: 30,
        spacingFactor: 1.4,
      },
    });

    cyRef.current = cy;

    cy.on("tap", "node", (evt: EventObject) => {
      const node = evt.target as NodeSingular;
      const related = node.predecessors().union(node.successors()).union(node);
      cy.elements().not(related).addClass("faded");
      related.removeClass("faded");
      cy.edges().removeClass("highlighted");
      related.edges().addClass("highlighted");
      setSelectedId(node.id());
    });

    cy.on("tap", (evt: EventObject) => {
      if (evt.target === cy) {
        cy.elements().removeClass("faded highlighted");
        setSelectedId(null);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [data]);

  const selectedNode: GraphNode | undefined = selectedId
    ? data.nodes.find((n) => n.id === selectedId)
    : undefined;

  const dependentCount = selectedNode
    ? data.edges.filter((e) => e.source === selectedNode.id).length
    : 0;

  return (
    <div className="graph-container">
      <div ref={containerRef} className="graph-canvas" />
      {selectedNode && (
        <div className="node-details">
          <h3>{selectedNode.address}</h3>
          <div className="details-grid">
            <div>
              <label>Resource type</label>
              <span>{selectedNode.type}</span>
            </div>
            <div>
              <label>Action</label>
              <span className={`action-badge action-${selectedNode.action}`}>
                {selectedNode.action}
              </span>
            </div>
            <div>
              <label>Depends on</label>
              <span>{selectedNode.dependencyCount}</span>
            </div>
            <div>
              <label>Depended on by</label>
              <span>{dependentCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
