import { useCallback } from 'react';
import { toast } from 'sonner';

interface FormField {
  name: string;
  value: any;
}

export const useAIFormAssist = () => {
  const fillFormFields = useCallback((fields: FormField[]) => {
    try {
      fields.forEach(({ name, value }) => {
        const input = document.querySelector(`[name="${name}"]`) as HTMLInputElement;
        if (input) {
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      toast.success('Form fields filled by AI assistant');
    } catch (error) {
      console.error('Form fill error:', error);
      toast.error('Failed to fill form fields');
    }
  }, []);

  return { fillFormFields };
};
