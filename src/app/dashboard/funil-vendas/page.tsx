import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";

export default function FunilVendasPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Funil de Vendas</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <span>Funil de Vendas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Um painel Kanban com etapas configuráveis para gerenciar oportunidades de vendas será implementado aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
