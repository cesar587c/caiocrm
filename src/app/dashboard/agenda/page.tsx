import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function AgendaPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Agenda e Compromissos</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>Agenda</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>A integração com Google Calendar, criação de compromissos e sistema de lembretes serão implementados aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
