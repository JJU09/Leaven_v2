import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().min(1, '업무 제목을 입력해주세요.').max(100, '제목은 100자 이내로 입력해주세요.'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  assigneeIds: z.array(z.string()).min(1, '담당자를 최소 1명 이상 선택해주세요.'),
  isAllDay: z.boolean(),
  startAt: z.string(), // ISO 8601
  endAt: z.string(),   // ISO 8601
  repeat: z.object({
    type: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'custom']).optional(),
    days: z.array(z.number()).optional(), // 0=일 ~ 6=토
    endDate: z.string().optional(),
  }).optional(),
  checklist: z.array(z.object({
    id: z.string(), // for dnd-kit
    text: z.string(),
    order: z.number(),
  })).max(20, '체크리스트는 최대 20개까지 추가할 수 있습니다.').optional(),
  attachmentIds: z.array(z.string()).max(5, '첨부파일은 최대 5개까지 업로드할 수 있습니다.').optional(),
  notifications: z.object({
    beforeDeadline: z.boolean(),
    notifyAssignees: z.boolean(),
    notifyManagerOnComplete: z.boolean(),
  })
}).refine((data) => {
  if (data.isAllDay) return true;
  return new Date(data.endAt) > new Date(data.startAt);
}, {
  message: '마감 시간은 시작 시간보다 이후여야 합니다.',
  path: ['endAt'],
});

export type TaskFormValues = z.infer<typeof taskSchema>;