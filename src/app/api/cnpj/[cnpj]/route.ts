import { NextResponse } from 'next/server';
import { consultarCnpj } from '@/ai/flows/consultar-cnpj-flow';

export async function GET(
  request: Request,
  { params }: { params: { cnpj: string } }
) {
  const { cnpj } = params;

  if (!cnpj) {
    return NextResponse.json({ error: 'CNPJ é obrigatório.' }, { status: 400 });
  }

  // Normalização: remove caracteres não numéricos
  const cleanedCnpj = cnpj.replace(/\D/g, '');

  // Validação: verifica se o CNPJ tem 14 dígitos
  if (cleanedCnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido. Deve conter 14 dígitos.' }, { status: 400 });
  }

  try {
    // Integração: chama o fluxo de IA para buscar os dados
    const result = await consultarCnpj({ cnpj: cleanedCnpj });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao consultar CNPJ via API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    return NextResponse.json(
      { error: 'Falha ao consultar dados do CNPJ.', details: errorMessage },
      { status: 500 }
    );
  }
}
