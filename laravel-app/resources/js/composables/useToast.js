import { toast as sonnerToast } from 'vue-sonner';

/**
 * Shadcn-style toast API ({ title, description, variant }) backed by vue-sonner.
 */
export function useToast() {
    function toast({ title, description, variant = 'default' } = {}) {
        const opts = { description };
        if (variant === 'destructive') {
            return sonnerToast.error(title, opts);
        }
        return sonnerToast(title, opts);
    }

    return { toast };
}
