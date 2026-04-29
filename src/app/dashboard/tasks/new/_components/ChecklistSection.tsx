import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { TaskFormValues } from '../_schema/task.schema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, GripVertical, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ChecklistSectionProps {
  form: UseFormReturn<TaskFormValues>;
}

function SortableItem({ id, index, form, remove }: { id: string; index: number; form: UseFormReturn<TaskFormValues>; remove: (index: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 group ${isDragging ? 'opacity-50' : ''}`}>
      <button
        type="button"
        className="p-1.5 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      <div className="w-4 h-4 rounded border border-slate-300 shrink-0" />
      
      <FormField
        control={form.control}
        name={`checklist.${index}.text`}
        render={({ field }) => (
          <FormItem className="flex-1 space-y-0">
            <FormControl>
              <Input 
                {...field} 
                placeholder="체크리스트 항목 입력..." 
                className="h-9 border-transparent hover:border-slate-200 focus:border-blue-500 bg-transparent hover:bg-white transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // trigger next line creation?
                  }
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <button
        type="button"
        onClick={() => remove(index)}
        className="p-1.5 text-slate-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ChecklistSection({ form }: ChecklistSectionProps) {
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'checklist',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((item) => item.id === active.id);
      const newIndex = fields.findIndex((item) => item.id === over.id);
      move(oldIndex, newIndex);
      
      // Update order values
      const currentList = form.getValues('checklist') || [];
      const updatedList = arrayMove(currentList, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        order: idx
      }));
      form.setValue('checklist', updatedList);
    }
  };

  const handleAddItem = () => {
    append({ id: crypto.randomUUID(), text: '', order: fields.length });
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">체크리스트</h2>
        <span className="text-sm text-slate-500">{fields.length}/20</span>
      </div>
      
      <div className="flex flex-col gap-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map(f => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1.5">
              {fields.map((field, index) => (
                <SortableItem
                  key={field.id}
                  id={field.id}
                  index={index}
                  form={form}
                  remove={remove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start mt-2 text-slate-500 hover:text-slate-900"
          onClick={handleAddItem}
          disabled={fields.length >= 20}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          항목 추가
        </Button>
      </div>
      
      <FormField
        control={form.control}
        name="checklist"
        render={() => <FormMessage />}
      />
    </div>
  );
}