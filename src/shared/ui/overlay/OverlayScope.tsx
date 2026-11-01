"use client";
import { createContext, useContext, type ReactNode } from "react";

const OverlayOwnerContext = createContext<string | undefined>(undefined);

/** Portalled children retain the ownership of the surface that opened them. */
export function OverlayScope({
  owner,
  children,
}: {
  owner: string;
  children: ReactNode;
}) {
  return (
    <OverlayOwnerContext.Provider value={owner}>
      {children}
    </OverlayOwnerContext.Provider>
  );
}
export function useOverlayOwner() {
  return useContext(OverlayOwnerContext);
}
