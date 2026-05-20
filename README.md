# Terraform Plan Graph Explorer

I built this because I got tired of trying to understand Terraform plans by reading JSON. When you're managing infrastructure with hundreds of resources, a text dump doesn't show you what actually matters: _which resources depend on which_, what breaks if one fails, and what the safe apply order looks like.

This is an interactive graph visualizer for Terraform plans. Upload a `terraform plan` JSON file (or try a sample), and you get an instant visual map of your infrastructure with color-coded changes and clickable dependency chains.

## What it does

- **Parse Terraform plans**: Upload any Terraform plan JSON and watch it parse instantly using Web Workers
- **Interactive graph visualization**: Cytoscape.js powers a responsive, zoomable dependency graph
- **Color-coded changes**: Green for creates, orange for updates, red for deletes, gray for no-ops
- **Dependency analysis**: Click any resource to highlight its entire dependency chain and see what else it touches
- **Critical path detection**: Automatically finds the longest dependency chain in your plan
- **Cycle detection**: Flags circular dependencies that would break your apply
- **Resource breakdown**: See counts by type and action at a glance

## Tech stack

- **React + TypeScript** for the UI
- **Cytoscape.js** for graph rendering with breadth-first layout
- **Web Workers** to parse Terraform plans without blocking the UI
- **Vite** for fast builds and dev server
- **Tailwind-inspired CSS** for clean, responsive design

## Running locally

```bash
npm install
npm run dev
```

Then visit `http://localhost:5173/` and either upload a Terraform plan or try one of the sample stacks (VPC setup or full application stack).

To build for production:

```bash
npm run build
npm run preview
```

## How it works

1. You provide a Terraform plan JSON file (from `terraform plan -out=tfplan && terraform show -json tfplan`)
2. A Web Worker parses the plan in the background to avoid freezing the UI
3. The parser:
   - Extracts all resource changes and groups them by type
   - Walks the configuration to find resource references and dependencies
   - Runs topological sort to find the critical path
   - Detects any circular dependencies
4. Cytoscape renders the graph with each resource as a node and dependencies as edges
5. Click any node to see its details and highlight everything it connects to

## Design decisions

- **Web Workers for parsing**: Terraform plans can be huge. Parsing in the main thread would freeze the UI, so the heavy lifting happens in a background thread
- **Breadth-first layout**: More intuitive for dependency graphs than force-directed layouts, shows you the layers of dependencies clearly
- **Implicit dependency extraction**: The parser pulls dependencies from Terraform references like `${aws_instance.example.id}` rather than relying on explicit `depends_on` declarations (which most code doesn't use)
- **Static hosting**: No backend needed—the whole app runs in the browser. Plans never leave your machine

## Sample plans included

- **VPC Setup**: A simple networking foundation with VPC, subnets, internet gateway, and ALB
- **App Stack**: A more complex example with database, security groups, autoscaling group, and CloudWatch logs

Both are realistic enough to show interesting dependency patterns but simple enough to understand quickly.

## Future directions

- Export graph as image or SVG
- Timeline view showing resource creation/update/deletion order
- Integration with Terraform Cloud API to pull plans directly
- Dark mode
- Support for moved blocks and other plan JSON v1.1+ features
