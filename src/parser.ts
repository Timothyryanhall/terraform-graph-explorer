import type { TerraformPlan, GraphData, GraphNode, GraphEdge } from "./types";

export function parseTerraformPlan(planJSON: string): GraphData {
  const plan: TerraformPlan = JSON.parse(planJSON);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // Create nodes from resource changes
  for (const [address, change] of Object.entries(plan.resource_changes)) {
    const action = change.change.actions[0] || "no-op";
    const node: GraphNode = {
      id: address,
      type: change.type,
      name: change.name,
      address,
      action,
      isDependent: false,
      dependencyCount: 0,
    };
    nodes.push(node);
    nodeMap.set(address, node);
  }

  // Extract dependencies from configuration
  const addressToDeps = extractDependencies(plan.configuration);

  // Build edges
  for (const [address, deps] of addressToDeps.entries()) {
    for (const dep of deps) {
      if (nodeMap.has(dep)) {
        edges.push({
          source: dep,
          target: address,
          implicit: false,
        });
        nodeMap.get(address)!.dependencyCount++;
        nodeMap.get(dep)!.isDependent = true;
      }
    }
  }

  // Calculate stats
  const resourceCount: Record<string, number> = {};
  const actionCounts: Record<string, number> = {};

  for (const node of nodes) {
    resourceCount[node.type] = (resourceCount[node.type] || 0) + 1;
    actionCounts[node.action] = (actionCounts[node.action] || 0) + 1;
  }

  // Detect cycles using DFS
  const cycles = detectCycles(nodeMap, edges);

  // Find critical path
  const criticalPath = findCriticalPath(nodeMap, edges);

  return {
    nodes,
    edges,
    resourceCount,
    actionCounts,
    cycles,
    criticalPath,
  };
}

function extractDependencies(
  config: Record<string, any>,
  parentAddr = ""
): Map<string, string[]> {
  const deps = new Map<string, string[]>();

  function traverse(obj: any, addr: string) {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      for (const item of obj) traverse(item, addr);
      return;
    }

    const entries = Object.entries(obj as Record<string, unknown>);
    for (const [key, value] of entries) {
      if (key === "resource" && typeof value === "object" && value !== null) {
        const resourceEntries = Object.entries(value as Record<string, unknown>);
        for (const [type, typeObj] of resourceEntries) {
          if (typeof typeObj === "object" && typeObj !== null) {
            const typeEntries = Object.entries(typeObj as Record<string, unknown>);
            for (const [name, resObj] of typeEntries) {
              const fullAddr = `${type}.${name}`;
              const resDeps = extractResourceDeps(resObj);
              if (resDeps.length > 0) {
                deps.set(fullAddr, resDeps);
              }
              traverse(resObj, fullAddr);
            }
          }
        }
      } else {
        traverse(value, addr);
      }
    }
  }

  traverse(config, parentAddr);
  return deps;
}

function extractResourceDeps(resource: any): string[] {
  const deps = new Set<string>();

  function findDepsInValue(val: any) {
    if (typeof val === "string") {
      // Match Terraform references like "aws_instance.example" or "${aws_instance.example.id}"
      const matches = val.match(
        /(?:\$\{)?(?!local\.)([a-z_]+(?:\.[a-z_]+)+)(?:\.[a-z_0-9.]+)?\)?/g
      );
      if (matches) {
        for (const match of matches) {
          const clean = match
            .replace(/^\$\{/, "")
            .replace(/\}$/, "")
            .split(".")[0];
          if (clean && !clean.startsWith("data.") && !clean.startsWith("var.")) {
            // Try to extract resource address
            const parts = match.split(".");
            if (
              parts.length >= 2 &&
              parts[0].match(/^[a-z_]+$/) &&
              parts[1].match(/^[a-z_0-9]+$/)
            ) {
              deps.add(`${parts[0]}.${parts[1]}`);
            }
          }
        }
      }
    } else if (typeof val === "object" && val !== null) {
      if (Array.isArray(val)) {
        for (const item of val) findDepsInValue(item);
      } else {
        const obj = val as Record<string, unknown>;
        for (const v of Object.values(obj)) findDepsInValue(v);
      }
    }
  }

  findDepsInValue(resource);
  return Array.from(deps);
}

function detectCycles(
  nodeMap: Map<string, GraphNode>,
  edges: GraphEdge[]
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const adjList = new Map<string, string[]>();
  for (const node of nodeMap.values()) {
    adjList.set(node.id, []);
  }
  for (const edge of edges) {
    adjList.get(edge.target)?.push(edge.source);
  }

  function dfs(node: string, path: string[]) {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    for (const neighbor of adjList.get(node) || []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, path);
      } else if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const nodeId of nodeMap.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return cycles;
}

function findCriticalPath(
  nodeMap: Map<string, GraphNode>,
  edges: GraphEdge[]
): string[] {
  // Topological sort
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodeMap.values()) {
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    adjList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(nodeId);
  }

  const sortedOrder: string[] = [];
  const distance = new Map<string, number>();

  for (const node of nodeMap.keys()) {
    distance.set(node, 0);
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    sortedOrder.push(node);

    for (const neighbor of adjList.get(node) || []) {
      const newDist = (distance.get(node) || 0) + 1;
      if (newDist > (distance.get(neighbor) || 0)) {
        distance.set(neighbor, newDist);
      }

      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  const maxDist = Math.max(...Array.from(distance.values()));
  const criticalPath: string[] = [];

  for (const [nodeId, dist] of distance.entries()) {
    if (dist === maxDist) {
      let current = nodeId;
      const path = [current];

      // Backtrack to find the path
      while (true) {
        let predecessor: string | null = null;
        for (const edge of edges) {
          if (
            edge.target === current &&
            (distance.get(edge.source) || 0) === (distance.get(current) || 0) - 1
          ) {
            predecessor = edge.source;
            break;
          }
        }
        if (!predecessor) break;
        path.unshift(predecessor);
        current = predecessor;
      }

      if (path.length > criticalPath.length) {
        criticalPath.length = 0;
        criticalPath.push(...path);
      }
    }
  }

  return criticalPath;
}
