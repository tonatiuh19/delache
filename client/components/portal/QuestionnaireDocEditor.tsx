import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bold, Italic, List, ListOrdered, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  className?: string;
};

export default function QuestionnaireDocEditor({
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const { t } = useTranslation();
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "<p></p>",
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[14rem] max-w-none px-4 py-3 text-sm leading-relaxed text-foreground outline-none prose prose-sm focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const btn =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-secondary disabled:opacity-40";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/30 p-2">
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label={t("cases.pdfStep.editor.bold")}
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label={t("cases.pdfStep.editor.italic")}
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label={t("cases.pdfStep.editor.bulletList")}
        >
          <List size={14} />
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label={t("cases.pdfStep.editor.orderedList")}
        >
          <ListOrdered size={14} />
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() => editor.chain().focus().undo().run()}
          aria-label={t("cases.pdfStep.editor.undo")}
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() => editor.chain().focus().redo().run()}
          aria-label={t("cases.pdfStep.editor.redo")}
        >
          <Redo2 size={14} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
