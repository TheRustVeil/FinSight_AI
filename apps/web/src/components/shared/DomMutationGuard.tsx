'use client';

// Defensive patch for the "Failed to execute 'insertBefore' on 'Node'" /
// removeChild crashes caused by translation/grammar browser extensions
// (Google/Brave Translate, Grammarly, etc.). They rewrite text nodes out from
// under React; when React then inserts/removes a sibling relative to a node the
// extension already moved, the native DOM call throws and App Router shows the
// global error boundary. We make insertBefore/removeChild no-throw when the
// reference/child node has a different parent so React recovers gracefully.
// See https://github.com/facebook/react/issues/11538.
//
// This MUST run before React's commit phase. We do it as a top-level module
// side effect (not in useEffect) so it executes when this client chunk is
// evaluated during bootstrap/render — before commitPlacement. A raw <script>
// in <head> or next/script `beforeInteractive` did NOT work here: App Router
// serializes inline script content into the RSC flight payload as data instead
// of emitting an executable tag, so it never ran.

if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const proto = Node.prototype as typeof Node.prototype & { __domGuardPatched?: boolean };
  if (!proto.__domGuardPatched) {
    proto.__domGuardPatched = true;

    const originalInsertBefore = proto.insertBefore;
    proto.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        // The extension moved the reference node. Don't throw — append instead.
        if (newNode.parentNode === this) return newNode;
        return this.appendChild(newNode) as unknown as T;
      }
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } as typeof proto.insertBefore;

    const originalRemoveChild = proto.removeChild;
    proto.removeChild = function <T extends Node>(this: Node, child: T): T {
      if (child.parentNode !== this) {
        // The extension already detached/moved it. Don't throw.
        return child;
      }
      return originalRemoveChild.call(this, child) as T;
    } as typeof proto.removeChild;
  }
}

export function DomMutationGuard() {
  return null;
}
