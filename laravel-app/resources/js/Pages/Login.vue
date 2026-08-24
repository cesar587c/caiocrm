<script setup>
import { ref } from 'vue';
import { Head, useForm } from '@inertiajs/vue3';
import { BrainCircuit, Eye, EyeOff, Loader2 } from 'lucide-vue-next';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';

const showPassword = ref(false);

const form = useForm({
    name: '',
    password: '',
});

function submit() {
    form.post('/login', {
        onError: () => form.reset('password'),
    });
}
</script>

<template>
    <Head title="Login" />

    <div class="flex min-h-screen items-center justify-center bg-background p-4">
        <Card class="w-full max-w-sm">
            <CardHeader class="text-center">
                <div class="flex justify-center items-center gap-2 mb-4">
                    <BrainCircuit class="h-10 w-10 text-primary" />
                    <h1 class="font-headline text-4xl font-semibold text-foreground">VendasPro</h1>
                </div>
                <CardTitle class="text-2xl">Login</CardTitle>
                <CardDescription>Acesse o painel com seu usuário e senha.</CardDescription>
            </CardHeader>
            <form @submit.prevent="submit">
                <CardContent class="space-y-4">
                    <div class="space-y-2">
                        <Label for="name">Nome de Usuário</Label>
                        <Input id="name" v-model="form.name" placeholder="Seu nome de usuário" autocomplete="username" />
                        <p v-if="form.errors.name" class="text-sm text-destructive">{{ form.errors.name }}</p>
                    </div>
                    <div class="space-y-2">
                        <Label for="password">Senha</Label>
                        <div class="relative">
                            <Input
                                id="password"
                                v-model="form.password"
                                :type="showPassword ? 'text' : 'password'"
                                placeholder="Sua senha"
                                class="pr-10"
                                autocomplete="current-password"
                            />
                            <button
                                type="button"
                                class="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground hover:text-foreground"
                                @click="showPassword = !showPassword"
                            >
                                <EyeOff v-if="showPassword" class="h-5 w-5" />
                                <Eye v-else class="h-5 w-5" />
                            </button>
                        </div>
                        <p v-if="form.errors.password" class="text-sm text-destructive">{{ form.errors.password }}</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" class="w-full" :disabled="form.processing">
                        <Loader2 v-if="form.processing" class="mr-2 h-4 w-4 animate-spin" />
                        Entrar
                    </Button>
                </CardFooter>
            </form>
        </Card>
    </div>
</template>
