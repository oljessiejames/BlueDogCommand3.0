import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDirectiveSchema, type InsertDirective, type Directive } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getActivePriorities } from "@/lib/priority";

interface DirectiveFormProps {
  directive?: Directive;
  onSubmit: (data: InsertDirective) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function DirectiveForm({ directive, onSubmit, onCancel, isPending }: DirectiveFormProps) {
  const activePriorities = getActivePriorities();

  const form = useForm<InsertDirective>({
    resolver: zodResolver(insertDirectiveSchema),
    defaultValues: {
      title: directive?.title || "",
      notes: directive?.notes || "",
      priority: directive?.priority || "Charlie",
      dueAt: directive?.dueAt || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter directive title"
                  {...field}
                  data-testid="input-directive-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-directive-priority">
                    <SelectValue placeholder="Select priority level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activePriorities.map((p) => {
                    const PriorityIcon = p.Icon;
                    return (
                      <SelectItem 
                        key={p.name} 
                        value={p.name}
                        data-testid={`option-priority-${p.name.toLowerCase()}`}
                      >
                        <div className="flex items-center gap-2">
                          <PriorityIcon className="h-3 w-3" />
                          <span>{p.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs">
                {field.value && activePriorities.find(p => p.name === field.value)?.description}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  value={field.value || ""}
                  data-testid="input-directive-due-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional details or instructions"
                  className="resize-none"
                  rows={4}
                  {...field}
                  value={field.value || ""}
                  data-testid="input-directive-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isPending}
            data-testid="button-directive-cancel"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-directive-submit">
            {directive ? "Update Directive" : "Create Directive"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
