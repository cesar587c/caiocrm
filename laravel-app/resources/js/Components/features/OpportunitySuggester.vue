<script setup>
import { reactive, ref } from 'vue';
import axios from 'axios';
import { BrainCircuit, Lightbulb, Loader2 } from 'lucide-vue-next';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { useToast } from '@/composables/useToast';

const { toast } = useToast();

const form = reactive({ clientProfile: '', historicalSalesData: '' });
const errors = reactive({});
const loading = ref(false);
const result = ref(null);

async function submit() {
    errors.clientProfile = form.clientProfile.length < 50 ? 'O perfil do cliente deve ter pelo menos 50 caracteres.' : null;
    errors.historicalSalesData = form.historicalSalesData.length < 50 ? 'O histórico de vendas deve ter pelo menos 50 caracteres.' : null;
    if (errors.clientProfile || errors.historicalSalesData) return;

    loading.value = true;
    result.value = null;
    try {
        const { data } = await axios.post('/opportunity-suggestions', {
            client_profile: form.clientProfile,
            historical_sales_data: form.historicalSalesData,
        });
        result.value = data.success;
    } catch (e) {
        toast({ variant: 'destructive', title: 'Falha ao obter sugestões. Por favor, tente novamente.' });
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <Card class="border-primary/20">
        <CardHeader>
            <CardTitle class="font-headline text-lg flex items-center gap-2">
                <BrainCircuit class="h-5 w-5 text-primary" />
                Sugestão de Oportunidades (IA)
            </CardTitle>
            <CardDescription>Descreva o cliente e o histórico para receber sugestões de novos negócios.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <div class="space-y-2">
                <Label>Perfil do Cliente</Label>
                <Textarea v-model="form.clientProfile" rows="4" placeholder="Descreva o segmento, porte, necessidades e infraestrutura atual do cliente..." />
                <p v-if="errors.clientProfile" class="text-xs text-destructive">{{ errors.clientProfile }}</p>
            </div>
            <div class="space-y-2">
                <Label>Histórico de Vendas</Label>
                <Textarea v-model="form.historicalSalesData" rows="4" placeholder="Descreva os produtos/serviços já contratados, valores e frequência de compra..." />
                <p v-if="errors.historicalSalesData" class="text-xs text-destructive">{{ errors.historicalSalesData }}</p>
            </div>
            <Button class="w-full" :disabled="loading" @click="submit">
                <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ loading ? 'Analisando...' : 'Gerar Sugestões' }}
            </Button>

            <div v-if="loading" class="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                A IA está trabalhando... Analisando dados para encontrar as melhores oportunidades.
            </div>

            <div v-if="result" class="space-y-4 pt-2">
                <div class="border-l-2 border-primary pl-3">
                    <p class="text-xs font-bold uppercase text-muted-foreground mb-1">Raciocínio da IA</p>
                    <blockquote class="text-sm italic text-foreground/80">{{ result.reasoning }}</blockquote>
                </div>
                <div>
                    <p class="text-xs font-bold uppercase text-muted-foreground mb-2">Oportunidades Sugeridas</p>
                    <div class="grid grid-cols-1 gap-2">
                        <div v-for="(op, idx) in result.opportunities" :key="idx" class="flex items-start gap-2 p-3 rounded-md bg-muted/40 border">
                            <Lightbulb class="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div class="text-sm">
                                <p class="font-semibold text-xs text-primary">Oportunidade #{{ idx + 1 }}</p>
                                <p>{{ op }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
</template>
