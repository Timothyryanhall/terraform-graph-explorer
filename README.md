# terraform-graph-explorer

A small browser-only tool for staring at Terraform plans. You give it the JSON output of `terraform show -json tfplan`, it gives you back the dependency graph — what depends on what, what the longest chain is, whether you've accidentally introduced a cycle.

[Live demo](https://timothyryanhall.github.io/terraform-graph-explorer/) · drop a plan in or pick a sample.

## Why

I kept running into plans where I couldn't tell, by eye, whether a destroy was going to take half my infrastructure with it. `terraform graph` exists but it dumps DOT and the output is unreadable past ~30 resources. `terraform show -json` has all the information already — it just isn't visual. So this reads the JSON, builds the DAG from the `references` arrays in `configuration.root_module.resources[].expressions`, and renders it.

There's no backend. Your plan never leaves the browser, which matters if your plans contain sensitive resource names (they usually do).

## What it does

- Parses any `terraform show -json` plan (format_version 1.x)
- Renders the dependency DAG with Cytoscape, color-coded by action (create / update / delete / replace / no-op)
- Click any node to highlight its full transitive reach — everything it depends on, everything that depends on it
- Computes the critical path (longest dependency chain — your apply-time bottleneck)
- Flags cycles, which shouldn't exist in a valid plan but occasionally do after a botched refactor

## Stack

React 19, TypeScript, Vite, Cytoscape.js. The parser runs in a Web Worker so the UI stays responsive on plans with thousands of resources.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173/terraform-graph-explorer/
npm run build        # production build into dist/
```

## Caveats

- Module references (`module.foo.bar`) are walked recursively but rendered with their fully-qualified address; deeply nested modules can clutter the layout. I want to add per-module collapsing eventually.
- `for_each` and `count` instances collapse to their parent address (`aws_instance.web` rather than `aws_instance.web["a"]`, `aws_instance.web["b"]`). Probably fine; if not, the parser change is one regex.
- The critical-path computation assumes a DAG. If the parser detects a cycle, the path is still computed but the result is misleading — the warning surfaces this.

## Things I'd add next

- Show the `before` → `after` diff for the selected node
- Group by module visually (subgraph clustering)
- Highlight `replace` actions more prominently — they're the ones that bite
- A way to filter to "everything affected if I destroy X"
