import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileAttachment } from '@/types/file-attachment';

interface AlertDialogManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function AlertDialogManager({
  isOpen,
  onOpenChange,
  onConfirm,
}: AlertDialogManagerProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle>대화 내용 초기화</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            새 대화를 시작하면 현재 대화 내용이 모두 초기화되고, 에이전트가
            재시작됩니다. 계속하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-indigo-600 hover:bg-indigo-700 text-white border-0"
            onClick={onConfirm}
          >
            확인
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}