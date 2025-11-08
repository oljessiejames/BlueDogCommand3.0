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

interface DirectiveFormProps {
  directive?: Directive;
  onSubmit: (data: InsertDirective) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function DirectiveForm({ directive, onSubmit, onCancel, isPending }: DirectiveFormProps) {
  const form = useForm<InsertDirective>({
    resolver: zodResolver(insertDirectiveSchema),
    defaultValues: {
      title: directive?.title || "",
      notes: directive?.notes || "",
      priority: directive?.priority || "med",
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
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-directive-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low" data-testid="option-priority-low">Low Priority</SelectItem>
                  <SelectItem value="med" data-testid="option-priority-med">Medium Priority</SelectItem>
                  <SelectItem value="high" data-testid="option-priority-high">High Priority</SelectItem>
                </SelectContent>
              </Select>
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
