"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import BoardSkeleton from "./BoardSkeleton";

const GrowthBoard = lazy(() => import("./GrowthBoard"));

export default function BoardScreen() {
  // Temporary preview delay; remove once the loading animation is approved.
  const [previewFinished, setPreviewFinished] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setPreviewFinished(true), 2000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!previewFinished) return <BoardSkeleton />;

  return (
    <Suspense fallback={<BoardSkeleton />}>
      <GrowthBoard />
    </Suspense>
  );
}
