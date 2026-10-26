import { useState, useEffect, useRef } from 'react';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import { 
  Undo2, 
  // Redo2, 
  Scissors, 
  Copy, 
  ClipboardPaste, 
  Trash2, 
  CheckSquare 
} from 'lucide-react';

export default function InputContextMenu() {
  const [menuState, setMenuState] = useState<{
    show: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
  }>({
    show: false,
    x: 0,
    y: 0,
    items: []
  });

  const activeElementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  
  // 🧠 Хранилище отменённых значений для работы кнопки "Повторить"
  const redoHistoryRef = useRef<Map<HTMLElement, { value: string; cursor: number }>>(new Map());

  useEffect(() => {
    // Если пользователь печатает руками в поле — стек повтора сбрасывается
    const handleInputTyping = (e: Event) => {
      const target = e.target as HTMLElement;
      if (redoHistoryRef.current.has(target)) {
        redoHistoryRef.current.delete(target);
      }
    };

    document.addEventListener('input', handleInputTyping, true);
    return () => document.removeEventListener('input', handleInputTyping, true);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const isInput = target instanceof HTMLInputElement;
      const isTextarea = target instanceof HTMLTextAreaElement;

      if (!isInput && !isTextarea) return;

      if (isInput) {
        const excludedTypes = ['file', 'checkbox', 'radio', 'range', 'color', 'submit', 'button'];
        if (excludedTypes.includes((target as HTMLInputElement).type)) return;
      }

      e.preventDefault();
      e.stopPropagation();

      const input = target as HTMLInputElement | HTMLTextAreaElement;
      activeElementRef.current = input;

      const text = input.value || '';
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;

      const hasText = text.length > 0;
      const hasSelection = start !== end;
      
      // 🎯 Проверяем: есть ли что возвращать по кнопке "Повторить"
      // const hasRedoAvailable = redoHistoryRef.current.has(input);

      // Правила доступности:
      const canUndo = hasText;
      // const canRedo = hasRedoAvailable;
      const canCut = hasText && hasSelection;
      const canCopy = hasText && hasSelection;
      const canPaste = true; 
      const canDelete = hasText && hasSelection;
      const canSelectAll = hasText;

      const updateInputValue = (newValue: string, newCursor: number) => {
        input.focus();
        input.value = newValue;
        input.setSelectionRange(newCursor, newCursor);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const items: ContextMenuItem[] = [
        {
          label: 'Отменить',
          shortcut: 'Ctrl + Z',
          icon: <Undo2 size={16} />,
          disabled: !canUndo,
          onClick: () => {
            input.focus();
            // Сохраняем состояние до отмены, чтобы можно было сделать "Повторить"
            redoHistoryRef.current.set(input, {
              value: input.value,
              cursor: input.selectionStart ?? input.value.length
            });
            document.execCommand('undo');
          }
        },
        // {
        //   label: 'Повторить',
        //   shortcut: 'Ctrl + Y',
        //   icon: <Redo2 size={16} />,
        //   disabled: !canRedo,
        //   onClick: () => {
        //     input.focus();
        //     const savedState = redoHistoryRef.current.get(input);
        //     if (savedState) {
        //       updateInputValue(savedState.value, savedState.cursor);
        //       redoHistoryRef.current.delete(input);
        //     } else {
        //       document.execCommand('redo');
        //     }
        //   }
        // },
        { isDivider: true },
        {
          label: 'Вырезать',
          shortcut: 'Ctrl + X',
          icon: <Scissors size={16} />,
          disabled: !canCut,
          onClick: async () => {
            const selectedText = text.substring(start, end);
            await navigator.clipboard.writeText(selectedText);
            const nextValue = text.slice(0, start) + text.slice(end);
            updateInputValue(nextValue, start);
          }
        },
        {
          label: 'Копировать',
          shortcut: 'Ctrl + C',
          icon: <Copy size={16} />,
          disabled: !canCopy,
          onClick: async () => {
            const selectedText = text.substring(start, end);
            await navigator.clipboard.writeText(selectedText);
          }
        },
        {
          label: 'Вставить',
          shortcut: 'Ctrl + V',
          icon: <ClipboardPaste size={16} />,
          disabled: !canPaste,
          onClick: async () => {
            try {
              const clipboardText = await navigator.clipboard.readText();
              const nextValue = text.slice(0, start) + clipboardText + text.slice(end);
              updateInputValue(nextValue, start + clipboardText.length);
            } catch (err) {
              console.warn('Не удалось прочитать буфер через API:', err);
              input.focus();
              document.execCommand('paste');
            }
          }
        },
        {
          label: 'Удалить',
          icon: <Trash2 size={16} />,
          disabled: !canDelete,
          isDanger: true,
          onClick: () => {
            const nextValue = text.slice(0, start) + text.slice(end);
            updateInputValue(nextValue, start);
          }
        },
        { isDivider: true },
        {
          label: 'Выбрать всё',
          shortcut: 'Ctrl + A',
          icon: <CheckSquare size={16} />,
          disabled: !canSelectAll,
          onClick: () => {
            input.focus();
            input.select();
          }
        }
      ];

      setMenuState({
        show: true,
        x: e.clientX,
        y: e.clientY,
        items
      });
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  return (
    <ContextMenu
      show={menuState.show}
      x={menuState.x}
      y={menuState.y}
      items={menuState.items}
      onClose={() => setMenuState(prev => ({ ...prev, show: false }))}
    />
  );
}