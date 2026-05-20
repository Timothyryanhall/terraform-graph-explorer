import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import type { Core } from "cytoscape";
import type { GraphData, GraphNode } from "../types";
import "./Graph.css";

interface GraphProps {
  data: GraphData;
}

export function Graph({ data }: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const nodes = data.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.address,
        action: node.action,
        type: node.type,
      },
    }));

    const edges = data.edges.map((edge) => ({
      data: {
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
      },
    }));

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: "node",
          style: {
            "background-color": function (ele: any) {
              const action = ele.data("action");
              if (action === "create") return "#10b981";
              if (action === "update") return "#f59e0b";
              if (action === "delete") return "#ef4444";
              return "#6b7280";
            },
            label: "data(label)",
            "font-size": "12px",
            "text-valign": "center",
            "text-halign": "center",
            "overlay-padding": "5px",
            width: "80px",
            height: "80px",
          } as any,
        },
        {
          selector: "node:selected",
          style: {
            "border-width": "3px",
            "border-color": "#000",
          } as any,
        },
        {
          selector: "node.highlighted",
          style: {
            "border-width": "3px",
            "border-color": "#3b82f6",
          } as any,
        },
        {
          selector: "edge",
          style: {
            "line-color": "#cbd5e1",
            width: "2px",
            "target-arrow-color": "#cbd5e1",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          } as any,
        },
        {
          selector: "edge.highlighted",
          style: {
            "line-color": "#3b82f6",
            width: "3px",
            "target-arrow-color": "#3b82f6",
          } as any,
        },
      ],
      layout: {
        name: "breadthFirstSearch",
        directed: true,
        nodeSep: 50,
        spacingFactor: 2,
      } as any,
    });

    cyRef.current = cy;

    cy.on("tap", "node", (evt: any) => {
      const node = evt.target;
      const nodeId = node.id();
      const nodeData = data.nodes.find((n) => n.id === nodeId);

      setSelectedNode(nodeData || null);

      // Find all dependencies and dependents
      const deps = new Set<string>();
      const queue = [nodeId];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        deps.add(current);

        // Find edges connected to this node
        for (const edge of data.edges) {
          if (edge.target === current && !visited.has(edge.source)) {
            queue.push(edge.source);
          }
          if (edge.source === current && !visited.has(edge.target)) {
            queue.push(edge.target);
          }
        }
      }

      cy.$("*").removeClass("highlighted");
      cy.$(
        nodeId +
          ", " +
          Array.from(deps)
            .map((d) => `#${d}`)
            .join(", ")
      ).addClass("highlighted");

      // Highlight edges
      cy.$("edge").removeClass("highlighted");
      for (const edge of data.edges) {
        if (deps.has(edge.source) && deps.has(edge.target)) {
          cy.$(`#${edge.source}-${edge.target}`).addClass("highlighted");
        }
      }
    });

    cy.on("tap", function (evt) {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.$("*").removeClass("highlighted");
      }
    });

    return () => {
      cy.destroy();
    };
  }, [data]);

  return (
    <div className="graph-container">
      <div ref={containerRef} className="graph-canvas" />
      {selectedNode && (
        <div className="node-details">
          <h3>{selectedNode.address}</h3>
          <div className="details-grid">
            <div>
              <label>Resource Type:</label>
              <span>{selectedNode.type}</span>
            </div>
            <div>
              <label>Action:</label>
              <span
                className={`action-badge action-${selectedNode.action}`}
              >
                {selectedNode.action}
              </span>
            </div>
            <div>
              <label>Dependencies:</label>
              <span>{selectedNode.dependencyCount}</span>
            </div>
            <div>
              <label>Dependent Resources:</label>
              <span>
                {
                  data.edges.filter((e) => e.target === selectedNode.id).length
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
