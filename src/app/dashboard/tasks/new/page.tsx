import { TaskNewForm } from './_components/TaskNewForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '새 업무 추가 | ShopWork AI',
};

export default function NewTaskPage() {
  return <TaskNewForm />;
}