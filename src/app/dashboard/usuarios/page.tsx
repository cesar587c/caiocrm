import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog } from "lucide-react";

export default function UsuariosPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Usuários e Permissões</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            <span>Usuários</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Funcionalidades para cadastro, edição e gerenciamento de perfis de usuário e permissões serão implementadas aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
