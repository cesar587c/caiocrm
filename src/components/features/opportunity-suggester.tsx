"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getOpportunitySuggestions } from "@/app/actions";
import type { SuggestOpportunitiesOutput } from "@/ai/flows/intelligent-opportunity-suggestion";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BrainCircuit, Lightbulb, Loader2, Sparkles } from "lucide-react";

const formSchema = z.object({
  clientProfile: z
    .string()
    .min(50, { message: "O perfil do cliente deve ter pelo menos 50 caracteres." }),
  historicalSalesData: z.string().min(50, {
    message: "Os dados históricos de vendas devem ter pelo menos 50 caracteres.",
  }),
});

export function OpportunitySuggester() {
  const [result, setResult] = useState<SuggestOpportunitiesOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientProfile: "",
      historicalSalesData: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);

    const response = await getOpportunitySuggestions(values);

    setIsLoading(false);

    if (response.error) {
      toast({
        variant: "destructive",
        title: "Erro na Sugestão",
        description: response.error,
      });
    } else if (response.success) {
      setResult(response.success);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="font-headline text-2xl">
                Sugestão Inteligente de Oportunidades
              </CardTitle>
              <CardDescription>
                Use nossa IA para descobrir novas oportunidades de vendas com base nos dados do cliente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="clientProfile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil do Cliente</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o cliente, seu setor, necessidades e pontos problemáticos..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Quanto mais detalhado, melhores serão as sugestões.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="historicalSalesData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dados Históricos de Vendas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Liste as compras anteriores, produtos, serviços, datas e valores..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Inclua informações sobre o engajamento passado do cliente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Sugestões
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="font-semibold">A IA está trabalhando...</p>
            <p className="text-sm text-muted-foreground">Analisando dados para encontrar as melhores oportunidades.</p>
        </div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl">Resultados da Análise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Raciocínio da IA</h3>
              <blockquote className="border-l-4 border-accent bg-accent/10 p-4 text-accent-foreground/80 italic rounded-r-md">
                {result.reasoning}
              </blockquote>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4">Oportunidades Sugeridas</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {result.opportunities.map((opp, index) => (
                  <Card key={index} className="bg-background/50">
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                       <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <Lightbulb className="h-5 w-5 text-primary" />
                       </div>
                      <CardTitle className="font-headline text-base font-medium">
                        Oportunidade #{index + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground/90">{opp}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
