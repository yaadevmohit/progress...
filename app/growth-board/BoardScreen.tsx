"use client";

import { lazy, Suspense } from "react";
import BoardSkeleton from "./BoardSkeleton";

const GrowthBoard = lazy(() => import("./GrowthBoard"));

export default function BoardScreen() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <GrowthBoard />
    </Suspense>
  );
}
