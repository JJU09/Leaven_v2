import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Task, TaskFormData, TaskPriority } from '../_types/task.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTaskMutations } from '../_hooks/useTaskMutations';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

const formSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  description: z.string().optional(),
  assignee_ids: z.array(z.string()).optional(),
  due_date: z.string().min(1, '마감일을 입력해주세요.'),
  priority: z.enum(['high', 'normal', 'low']),
});

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  assignerId: string;
  staffList: { id: string; name: string }[];
  taskToEdit?: Task | null;
}

export function TaskFormDialog({ open, onOpenChange, storeId, assignerId, staffList, taskToEdit }: TaskFormDialogProps) {
  const { createTask, updateTask } = useTaskMutations(storeId);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      assignee_ids: [],
      due_date: format(new Date(), 'yyyy-MM-dd'),
      priority: 'normal',
    },
  });

  useEffect(() => {
    if (open && taskToEdit) {
      form.reset({
        title: taskToEdit.title,
        description: taskToEdit.description || '',
        assignee_ids: taskToEdit.assignee_id ? [taskToEdit.assignee_id] : [],
        due_date: taskToEdit.due_date || format(new Date(), 'yyyy-MM-dd'),
        priority: taskToEdit.priority || 'normal',
      });
    } else if (open && !taskToEdit) {
      form.reset({
        title: '',
        description: '',
        assignee_ids: [],
        due_date: format(new Date(), 'yyyy-MM-dd'),
        priority: 'normal',
      });
    }
  }, [open, taskToEdit, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const dataToSubmit = {
      ...values,
      due_date: new Date(values.due_date),
      description: values.description || '',
      assignee_ids: values.assignee_ids || [],
    };

    if (taskToEdit) {
      await updateTask.mutateAsync({
        id: taskToEdit.id,
        data: dataToSubmit,
      });
    } else {
      await createTask.mutateAsync({
        ...dataToSubmit,
        assigner_id: assignerId,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? '업무 편집' : '업무 추가'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="업무 제목을 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea placeholder="업무 상세 내용을 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>마감일 *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  <FormLabel>우선순위</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="우선순위 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="normal">보통</SelectItem>
                      <SelectItem value="low">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignee_ids"
              render={() => (
                <FormItem>
                  <FormLabel>담당자 (복수 선택 가능)</FormLabel>
                  <ScrollArea className="h-[120px] w-full border rounded-md p-2">
                    {staffList.map((staff) => (
                      <FormField
                        key={staff.id}
                        control={form.control}
                        name="assignee_ids"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={staff.id}
                              className="flex flex-row items-start space-x-3 space-y-0 py-1"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(staff.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), staff.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value: string) => value !== staff.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {staff.name}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
              <Button type="submit">{taskToEdit ? '저장' : '추가'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}