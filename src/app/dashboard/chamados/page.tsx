import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookUser } from "lucide-react";

export default function ChamadosPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Chamados e Atendimentos</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookUser className="h-5 w-5" />
            <span>Chamados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>O sistema de controle de chamados, tarefas, SLA e histórico de atendimentos será implementado aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
