"use client";

import React from "react";

export default function ModuleLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return <>{children}</>;
}
