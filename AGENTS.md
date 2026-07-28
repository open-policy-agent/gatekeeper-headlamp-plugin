# Repository guidance

This is a Headlamp plugin for operating OPA Gatekeeper resources in Kubernetes. Keep user documentation in `README.md`; development setup and commands belong in `CONTRIBUTING.md`.

## Codebase gotchas

### Constraints and violations are derived

Constraint kinds and REST plurals come from installed `ConstraintTemplate` objects. Do not hardcode a fixed set or apply generic English pluralization. Preserve the `ConstraintTemplate` `v1`/`v1beta1` fallback and the `constraints.gatekeeper.sh/v1beta1` discovery flow in `src/model.ts`.

Constraint identity is `kind` plus `name`; detail routes require both. A kind-specific miss must return not found rather than silently searching other constraint kinds. Violations are flattened from each Constraint's `status.violations`, not fetched from a standalone Violation CRD.

### Optional resources are heterogeneous

Optional Gatekeeper CRDs may be absent. Missing APIs should degrade only the affected view; reuse `ResourceListError` so missing CRDs, authentication, RBAC, connectivity, and server failures remain distinct.

`Config` and `Connection` are namespaced; their links and routes must retain the namespace. Most other resources here are cluster-scoped. REST plurals such as `assign`, `assignmetadata`, `assignimage`, `modifyset`, and `expansiontemplate` are intentional—follow `src/model.ts`.

### Routes have compatibility constraints

Use matching `RoutingPath` and `RouteName` constants and the registered route name in every Headlamp link. Preserve the `/c/<cluster>` prefix during tab navigation, redirects, and deletion.

Register the legacy `/gatekeeper/library/template/:id` route before `/gatekeeper/library/:category/:name`. Providers belong to External Data; Connections belong canonically to Violation Export. The External Data Connection routes are compatibility aliases only.

### Reuse shared cluster behavior

Use Headlamp's API proxy or custom-resource classes for cluster I/O. Prefer the shared detail state, deletion, error, and Gatekeeper status components. Readiness depends on errors, observed generation, per-pod reports, and explicit `active`/`enforced` fields when available; existence alone is insufficient. `SyncSet` intentionally has no per-resource readiness status.

Ordinary CRD views list, inspect, and delete resources. Policy Library deployment is the intentional create workflow.

### Policy Library input is external

Keep GitHub requests bounded and partial failures visible; the optional token is memory-only. Treat fetched YAML as untrusted input. Preserve parsing and shape checks, canonical category/name routing, and legacy route resolution.

On a `ConstraintTemplate` conflict, continue only when the existing and library specs are semantically equivalent. Wait for the generated CRD to become established before creating the Constraint.

### Documentation is a product surface

Keep README language user-facing and contributor guidance in `CONTRIBUTING.md`. Use sanitized demo data in screenshots, and update the README gallery and `artifacthub-pkg.yml` together.

## Verification

Follow `CONTRIBUTING.md#validation` and run focused tests near the change:

- routes and links: `src/index.routes.test.tsx`, `src/navigation.test.tsx`, `src/route-links.test.ts`
- models, Constraints, and Violations: adjacent `*.test.*` files under `src/`
- Policy Library: `src/library/libraryData.test.ts` and `src/library/TemplateDetails.test.tsx`
- shared resource behavior: tests under `src/components/`

Report checks that were skipped.
