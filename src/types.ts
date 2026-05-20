// Shape matches `terraform show -json` output (format_version 1.x).
// https://developer.hashicorp.com/terraform/internals/json-format

export type ResourceAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "no-op"
  | "replace";

export interface TerraformPlan {
  format_version: string;
  terraform_version: string;
  resource_changes?: ResourceChange[];
  configuration?: Configuration;
}

export interface ResourceChange {
  address: string;
  type: string;
  name: string;
  provider_name: string;
  module_address?: string;
  change: {
    actions: Array<"create" | "read" | "update" | "delete" | "no-op">;
    before: unknown;
    after: unknown;
    after_unknown?: unknown;
  };
}

export interface Configuration {
  root_module?: ConfigModule;
}

export interface ConfigModule {
  resources?: ConfigResource[];
  module_calls?: Record<string, { module: ConfigModule }>;
}

export interface ConfigResource {
  address: string;
  type: string;
  name: string;
  // Each key is an attribute name; values may have constant_value or references.
  expressions?: Record<string, ConfigExpression | ConfigExpression[]>;
}

export interface ConfigExpression {
  constant_value?: unknown;
  references?: string[];
}

export interface GraphNode {
  id: string;
  type: string;
  name: string;
  address: string;
  action: ResourceAction;
  isDependent: boolean;
  dependencyCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  resourceCount: Record<string, number>;
  actionCounts: Partial<Record<ResourceAction, number>>;
  cycles: string[][];
  criticalPath: string[];
}
