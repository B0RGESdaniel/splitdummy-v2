"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const PortalContainerContext = createContext<HTMLElement | null>(null);

/**
 * Wraps a subtree in a DOM node and publishes that node as the portal
 * container for descendant dialogs (via usePortalContainer). Radix portals
 * render outside the React tree's DOM position, so a scoped theme class
 * (CSS custom properties) on an ancestor wouldn't otherwise reach them.
 */
export function ThemeScope({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  return (
    <div ref={setNode} className={className}>
      <PortalContainerContext.Provider value={node}>
        {children}
      </PortalContainerContext.Provider>
    </div>
  );
}

export function usePortalContainer() {
  return useContext(PortalContainerContext);
}
