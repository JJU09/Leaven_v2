import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { TaskFormValues } from '../_schema/task.schema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, X, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskStaff } from '../_hooks/useTaskStaff';

interface AssigneeSectionProps {
  form: UseFormReturn<TaskFormValues>;
  storeId: string | null;
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700'
];

function getInitials(name: string) {
  return name.substring(0, 2);
}

function getColorForId(id: string | number) {
  // simple hash to pick a consistent color
  const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function AssigneeSection({ form, storeId }: AssigneeSectionProps) {
  const [open, setOpen] = useState(false);
  const { data: staffList = [], isLoading } = useTaskStaff(storeId);

  const selectedIds = form.watch('assigneeIds') || [];
  
  const selectedStaff = staffList.filter(staff => selectedIds.includes(String(staff.id)));

  const handleToggleStaff = (staffId: string | number) => {
    const stringId = String(staffId);
    const current = form.getValues('assigneeIds') || [];
    
    if (current.includes(stringId)) {
      form.setValue('assigneeIds', current.filter(id => id !== stringId), { shouldValidate: true });
    } else {
      form.setValue('assigneeIds', [...current, stringId], { shouldValidate: true });
    }
  };

  const handleRemoveStaff = (staffId: string | number) => {
    const stringId = String(staffId);
    const current = form.getValues('assigneeIds') || [];
    form.setValue('assigneeIds', current.filter(id => id !== stringId), { shouldValidate: true });
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-6">
      <h2 className="text-lg font-medium">담당자</h2>
      
      <FormField
        control={form.control}
        name="assigneeIds"
        render={() => (
          <FormItem className="flex flex-col">
            <FormLabel>담당자 선택 <span className="text-red-500">*</span></FormLabel>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedStaff.map(staff => (
                <div 
                  key={staff.id} 
                  className="flex items-center gap-1.5 py-1.5 pl-2 pr-1.5 rounded-full border border-slate-200 bg-white text-sm shadow-sm"
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0",
                    getColorForId(staff.id)
                  )}>
                    {getInitials(staff.name)}
                  </div>
                  <span className="font-medium text-slate-700">{staff.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStaff(staff.id)}
                    className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-[34px] rounded-full px-3 text-sm font-normal text-slate-600 hover:text-slate-900 border-dashed"
                    disabled={isLoading || !storeId}
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    담당자 추가
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="이름 검색..." />
                    <CommandList>
                      <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                      <CommandGroup>
                        {staffList.map((staff) => (
                          <CommandItem
                            key={staff.id}
                            value={staff.name}
                            onSelect={() => handleToggleStaff(staff.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedIds.includes(String(staff.id)) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0",
                                getColorForId(staff.id)
                              )}>
                                {getInitials(staff.name)}
                              </div>
                              <div className="flex flex-col">
                                <span>{staff.name}</span>
                                <span className="text-[10px] text-slate-500">{staff.role}</span>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}