import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ClientesPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Gestão de Clientes</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Clientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Funcionalidades para importação, cadastro, classificação e consulta de clientes serão implementadas aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
