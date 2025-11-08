import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertNoticeSchema, type InsertNotice, type Notice } from "@shared/schema";
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

interface NoticeFormProps {
  notice?: Notice;
  onSubmit: (data: InsertNotice) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function NoticeForm({ notice, onSubmit, onCancel, isPending }: NoticeFormProps) {
  const form = useForm<InsertNotice>({
    resolver: zodResolver(insertNoticeSchema),
    defaultValues: {
      title: notice?.title || "",
      notes: notice?.notes || "",
      at: notice?.at || "",
      repeat: notice?.repeat || "none",
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
                  placeholder="Enter notice title"
                  {...field}
                  data-testid="input-notice-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scheduled Time</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  data-testid="input-notice-time"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="repeat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repeat</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-notice-repeat">
                    <SelectValue placeholder="Select repeat pattern" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none" data-testid="option-repeat-none">No Repeat</SelectItem>
                  <SelectItem value="daily" data-testid="option-repeat-daily">Daily</SelectItem>
                  <SelectItem value="weekly" data-testid="option-repeat-weekly">Weekly</SelectItem>
                  <SelectItem value="monthly" data-testid="option-repeat-monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
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
                  placeholder="Additional details or context"
                  className="resize-none"
                  rows={4}
                  {...field}
                  value={field.value || ""}
                  data-testid="input-notice-notes"
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
            data-testid="button-notice-cancel"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-notice-submit">
            {notice ? "Update Notice" : "Create Notice"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
