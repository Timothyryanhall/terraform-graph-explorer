import type {
  TerraformPlan,
  GraphData,
  GraphNode,
  GraphEdge,
  ResourceAction,
  ConfigModule,
} from "./types";

export function parseTerraformPlan(planJSON: string): GraphData {
  const plan: TerraformPlan = JSON.parse(planJSON);

  const nodes: GraphNode[] = [];
  const nodeMap = new Map<string, GraphNode>();

  for (const change of plan.resource_changes ?? []) {
    const node: GraphNode = {
      id: change.address,
      type: change.type,
      name: change.name,
      address: change.address,
      action: collapseActions(change.change.actions),
      isDependent: false,
      dependencyCount: 0,
    };
    nodes.push(node);
    nodeMap.set(change.address, node);
  }

  const refs = collectReferences(plan.configuration?.root_module);
  const edges: GraphEdge[] = [];
  for (const [target, sources] of refs) {
    for (const source of sources) {
      if (!nodeMap.has(source) || source === target) continue;
      edges.push({ source, target });
      nodeMap.get(target)!.dependencyCount++;
      nodeMap.get(source)!.isDependent = true;
    }
  }

  const resourceCount: Record<string, number> = {};
  const actionCounts: Partial<Record<ResourceAction, number>> = {};
  for (const node of nodes) {
    resourceCount[node.type] = (resourceCount[node.type] ?? 0) + 1;
    actionCounts[node.action] = (actionCounts[node.action] ?? 0) + 1;
  }

  return {
    nodes,
    edges,
    resourceCount,
    actionCounts,
    cycles: detectCycles(nodes, edges),
    criticalPath: findCriticalPath(nodes, edges),
  };
}

// Terraform encodes a replace as ["delete","create"]; treat any multi-action set
// containing both as a replace, and otherwise take the first action.
function collapseActions(actions: ResourceChange["change"]["actions"]): ResourceAction {
  if (actions.includes("delete") && actions.includes("create")) return "replace";
  return (actions[0] ?? "no-op") as ResourceAction;
}
// (local alias so the import list stays clean)
type ResourceChange = import("./types").ResourceChange;

// Walks the configuration tree (including nested module_calls) and returns, for
// each resource address, the set of resource addresses it depends on. The
// `references` array on each expression points at things like
// "aws_vpc.main.id" — we normalize to the "type.name" prefix.
function collectReferences(
  root: ConfigModule | undefined
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  if (!root) return out;

  const stack: ConfigModule[] = [root];
  while (stack.length) {
    const mod = stack.pop()!;
    for (const resource of mod.resources ?? []) {
      const refs = new Set<string>();
      collectRefsDeep(resource.expressions, refs);
      const deps = new Set<string>();
      for (const ref of refs) {
        const dep = resourceAddrFromRef(ref);
        if (dep && dep !== resource.address) deps.add(dep);
      }
      if (deps.size) out.set(resource.address, deps);
    }
    for (const call of Object.values(mod.module_calls ?? {})) {
      stack.push(call.module);
    }
  }
  return out;
}

// Terraform encodes attribute *blocks* (subject {}, source {}, etc.) as arrays
// of objects whose keys are themselves sub-expressions. Walk the whole tree
// and pick up any `references` array we encounter — that's the only signal we
// care about. `constant_value` and other leaves are ignored.
function collectRefsDeep(val: unknown, into: Set<string>): void {
  if (val === null || val === undefined) return;
  if (Array.isArray(val)) {
    for (const v of val) collectRefsDeep(v, into);
    return;
  }
  if (typeof val !== "object") return;
  for (const [key, child] of Object.entries(val as Record<string, unknown>)) {
    if (key === "references" && Array.isArray(child)) {
      for (const ref of child) if (typeof ref === "string") into.add(ref);
    } else if (key !== "constant_value") {
      collectRefsDeep(child, into);
    }
  }
}

function resourceAddrFromRef(ref: string): string | null {
  // Skip data.*, var.*, local.*, module.*, path.*, terraform.*, count.*, each.*
  if (/^(data|var|local|module|path|terraform|count|each|self)\./.test(ref)) {
    return null;
  }
  // "aws_vpc.main" or "aws_vpc.main.id" or "aws_vpc.main[0].id"
  const m = ref.match(/^([a-zA-Z][\w]*)\.([\w-]+)/);
  return m ? `${m[1]}.${m[2]}` : null;
}

function detectCycles(nodes: GraphNode[], edges: GraphEdge[]): string[][] {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) adj.get(e.source)?.push(e.target);

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string, path: string[]) {
    visited.add(node);
    stack.add(node);
    path.push(node);
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) {
        dfs(next, path);
      } else if (stack.has(next)) {
        const start = path.indexOf(next);
        if (start !== -1) cycles.push([...path.slice(start), next]);
      }
    }
    path.pop();
    stack.delete(node);
  }

  for (const n of nodes) if (!visited.has(n.id)) dfs(n.id, []);
  return cycles;
}

// Longest path in the DAG via topological-sort + relaxation. Returns the path
// itself (not just its length) so the UI can highlight it.
function findCriticalPath(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const adj = new Map<string, string[]>();
  const rev = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const n of nodes) {
    adj.set(n.id, []);
    rev.set(n.id, []);
    indeg.set(n.id, 0);
  }
  for (const e of edges) {
    adj.get(e.source)!.push(e.target);
    rev.get(e.target)!.push(e.source);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
  const dist = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const pred = new Map<string, string | null>(nodes.map((n) => [n.id, null]));

  let head = 0;
  let maxDist = 0;
  let maxNode: string | null = null;
  while (head < queue.length) {
    const node = queue[head++];
    const nodeDist = dist.get(node)!;
    if (nodeDist > maxDist) {
      maxDist = nodeDist;
      maxNode = node;
    }
    for (const next of adj.get(node) ?? []) {
      if (nodeDist + 1 > (dist.get(next) ?? 0)) {
        dist.set(next, nodeDist + 1);
        pred.set(next, node);
      }
      indeg.set(next, indeg.get(next)! - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }

  if (!maxNode) return [];
  const path: string[] = [];
  let cur: string | null = maxNode;
  while (cur) {
    path.unshift(cur);
    cur = pred.get(cur) ?? null;
  }
  return path;
}
