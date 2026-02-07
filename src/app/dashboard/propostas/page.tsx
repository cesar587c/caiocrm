import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function PropostasPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Propostas Comerciais</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Propostas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Um editor de propostas, motor de documentos, e funcionalidades de envio e rastreamento serão implementados aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
