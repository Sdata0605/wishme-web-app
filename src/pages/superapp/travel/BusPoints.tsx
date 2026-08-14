import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, BUS_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type StopPoint, boardingPoints, droppingPoints, readBus, writeBus } from "@/lib/superapp/buses";
import { cn } from "@/lib/utils";

function PointList({
  title,
  points,
  selected,
  onSelect,
}: {
  title: string;
  points: StopPoint[];
  selected?: string;
  onSelect: (p: StopPoint) => void;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-2 p-5">
        <h3 className="font-semibold">{title}</h3>
        {points.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className={cn(
              "flex w-full items-start justify-between rounded-xl border px-3 py-2 text-left text-sm",
              selected === p.id ? "border-primary bg-primary/10" : "border-border"
            )}
          >
            <span>
              <span className="font-medium">{p.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{p.landmark}</span>
            </span>
            <span className="text-xs">{p.time}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export default function BusPoints() {
  const stored = readBus();
  const navigate = useNavigate();
  const [boarding, setBoarding] = useState<StopPoint | undefined>(stored?.boarding);
  const [dropping, setDropping] = useState<StopPoint | undefined>(stored?.dropping);
  if (!stored) return <Navigate to="/travel/bus" replace />;

  const board = boardingPoints(stored.search.from, stored.bus.depart);
  const drop = droppingPoints(stored.search.to, stored.bus.arrive);

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Boarding & dropping" subtitle="Pick a stop like redBus — landmark + reporting time" />
      <TravelStepper steps={BUS_STEPS} current="points" />
      <div className="grid gap-4 lg:grid-cols-2">
        <PointList title="Boarding point" points={board} selected={boarding?.id} onSelect={setBoarding} />
        <PointList title="Dropping point" points={drop} selected={dropping?.id} onSelect={setDropping} />
      </div>
      <Button
        className="mt-4 rounded-xl"
        disabled={!boarding || !dropping}
        onClick={() => {
          writeBus({ ...stored, boarding, dropping });
          navigate("/travel/bus/passenger");
        }}
      >
        Continue
      </Button>
    </ServicesPageLayout>
  );
}
