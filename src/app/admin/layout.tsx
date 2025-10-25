import React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // This layout is minimal, as the dashboard will have its own complex layout.
  // This could be used for login, registration, etc. which don't have the sidebar.
  return <div className="min-h-screen bg-muted/40">{children}</div>;
}
