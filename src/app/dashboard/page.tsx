import { OpportunitySuggester } from "@/components/features/opportunity-suggester";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center gap-4">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
      </div>

      <OpportunitySuggester />
    </div>
  );
}
