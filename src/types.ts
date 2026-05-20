export interface TerraformPlan {
  format_version: string;
  terraform_version: string;
  planned_values?: Record<string, any>;
  resource_changes: Record<string, ResourceChange>;
  configuration: Record<string, any>;
}

export interface ResourceChange {
  type: string;
  name: string;
  provider_name: string;
  module_address?: string;
  change: {
    actions: Array<"create" | "read" | "update" | "delete" | "no-op">;
    before: any;
    after: any;
    after_unknown?: any;
    before_sensitive?: any;
    after_sensitive?: any;
  };
}

export interface GraphNode {
  id: string;
  type: string;
  name: string;
  address: string;
  action: string;
  isDependent: boolean;
  dependencyCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  implicit: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  resourceCount: Record<string, number>;
  actionCounts: Record<string, number>;
  cycles: string[][];
  criticalPath: string[];
}
