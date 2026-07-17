"use client";

import { use } from "react";
import "../planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import Workspace from "@/components/planner/Workspace";

export default function TripWorkspacePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  return (
    <PlannerShell tripId={tripId}>
      <Workspace tripId={tripId} />
    </PlannerShell>
  );
}
