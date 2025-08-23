import { useEffect, useRef } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Simple freeform rich note editor with right-click actions
// Props keep persistence and navigation in parent component
interface RichNoteEditorProps {
  html: string;
  onChange: (html: string) => void; // persist debounced
  onConvertToPage: (title: string) => Promise<string | null>; // returns new page id
  onOpenPage: (pageId: string) => void;
}

const COLORS = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;

type ColorName = typeof COLORS[number];

const colorClass = (c: ColorName) => (c === "default" ? "org-text-default" : `org-text-${c}`);
const bgColorClass = (c: ColorName) => (c === "default" ? "org-bg-default" : `org-bg-${c}`);

export default function RichNoteEditor({ html, onChange, onConvertToPage, onOpenPage }: RichNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  const isActivelyEditingRef = useRef(false);
  const lastHtmlRef = useRef(html);
  
  // Preservar cursor position durante updates
  const preserveCursor = (callback: () => void) => {
    if (!editorRef.current || isActivelyEditingRef.current) return;
    
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      callback();
      return;
    }

    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const caretOffset = preCaretRange.toString().length;

    callback();

    // Restaurar cursor após update
    setTimeout(() => {
      if (!editorRef.current) return;
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let charCount = 0;
      let node;
      
      while (node = walker.nextNode()) {
        const nodeLength = node.textContent?.length || 0;
        if (charCount + nodeLength >= caretOffset) {
          const newRange = document.createRange();
          newRange.setStart(node, Math.max(0, caretOffset - charCount));
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          break;
        }
        charCount += nodeLength;
      }
    }, 0);
  };

  useEffect(() => {
    if (html !== lastHtmlRef.current && editorRef.current) {
      preserveCursor(() => {
        if (editorRef.current && !isActivelyEditingRef.current) {
          editorRef.current.innerHTML = html || "";
        }
      });
      lastHtmlRef.current = html;
    }
  }, [html]);

  // Debounced save
  const scheduleSave = (nextHtml: string) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      onChange(nextHtml);
    }, 500);
  };

  const withinEditor = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const anchor = sel.anchorNode as Node | null;
    const focus = sel.focusNode as Node | null;
    const root = editorRef.current;
    if (!root) return false;
    const contains = (node: Node | null) => !!node && (node === root || root.contains(node));
    return contains(anchor) && contains(focus);
  };

  const applyBold = () => {
    if (!withinEditor()) return;
    document.execCommand("bold", false);
    const next = editorRef.current?.innerHTML || "";
    scheduleSave(next);
  };

  const applyColor = (c: ColorName) => {
    if (!withinEditor()) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    // Wrap selection in a span with our color class
    const span = document.createElement("span");
    span.className = colorClass(c);
    try {
      const extracted = range.extractContents();
      span.appendChild(extracted);
      range.insertNode(span);
      // Move caret after inserted span
      sel.removeAllRanges();
      const after = document.createRange();
      after.setStartAfter(span);
      after.collapse(true);
      sel.addRange(after);
    } catch {
      // Fallback: insert plain text wrapped (may drop nested markup)
      const text = sel.toString();
      span.textContent = text;
      range.deleteContents();
      range.insertNode(span);
    }
    const next = editorRef.current?.innerHTML || "";
    scheduleSave(next);
  };

  const applyBackgroundColor = (c: ColorName) => {
    if (!withinEditor()) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    // Wrap selection in a span with our background color class
    const span = document.createElement("span");
    span.className = bgColorClass(c);
    try {
      const extracted = range.extractContents();
      span.appendChild(extracted);
      range.insertNode(span);
      // Move caret after inserted span
      sel.removeAllRanges();
      const after = document.createRange();
      after.setStartAfter(span);
      after.collapse(true);
      sel.addRange(after);
    } catch {
      // Fallback: insert plain text wrapped (may drop nested markup)
      const text = sel.toString();
      span.textContent = text;
      range.deleteContents();
      range.insertNode(span);
    }
    const next = editorRef.current?.innerHTML || "";
    scheduleSave(next);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Generate a unique filename without requiring user authentication
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('org-images')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        toast.error("Erro ao fazer upload da imagem");
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('org-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        toast.loading("Fazendo upload da imagem...");
        const imageUrl = await uploadImage(file);
        toast.dismiss();
        
        if (imageUrl) {
          const img = document.createElement('img');
          img.src = imageUrl;
          img.alt = 'Imagem colada';
          img.className = 'max-w-full h-auto rounded-lg my-2';
          
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.insertNode(img);
            range.setStartAfter(img);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          
          const next = editorRef.current?.innerHTML || "";
          scheduleSave(next);
          toast.success("Imagem adicionada com sucesso!");
        }
        break;
      }
    }
  };

  const convertSelectionToPage = async () => {
    if (!withinEditor()) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim().slice(0, 80) || "Nova página";
    const pageId = await onConvertToPage(text);
    if (!pageId) return;

    const range = sel.getRangeAt(0);
    const link = document.createElement("a");
    link.textContent = text;
    link.href = `#`;
    link.setAttribute("data-page-id", pageId);
    link.className = "underline underline-offset-4 text-primary hover:opacity-80 transition-smooth";
    range.deleteContents();
    range.insertNode(link);

    const next = editorRef.current?.innerHTML || "";
    scheduleSave(next);
  };

  const handleInput = () => {
    isActivelyEditingRef.current = true;
    const next = editorRef.current?.innerHTML || "";
    lastHtmlRef.current = next;
    scheduleSave(next);
    
    // Reset editing flag after a delay
    setTimeout(() => {
      isActivelyEditingRef.current = false;
    }, 1000);
  };

  const handleFocus = () => {
    isActivelyEditingRef.current = true;
  };

  const handleBlur = () => {
    setTimeout(() => {
      isActivelyEditingRef.current = false;
    }, 100);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === "A" && target.dataset.pageId) {
      e.preventDefault();
      onOpenPage(target.dataset.pageId);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[320px] whitespace-pre-wrap bg-transparent px-0 py-2 focus:outline-none"
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          onPaste={handlePaste}
        />
      </ContextMenuTrigger>
      <ContextMenuContent className="z-50">
        <ContextMenuItem onSelect={applyBold}>Negrito</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>Cor do texto</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {COLORS.map((c) => (
              <ContextMenuItem key={c} onSelect={() => applyColor(c)}>
                <span className={colorClass(c)}>{c}</span>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Cor de fundo</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {COLORS.map((c) => (
              <ContextMenuItem key={c} onSelect={() => applyBackgroundColor(c)}>
                <span className={bgColorClass(c)} style={{ padding: '2px 8px', borderRadius: '4px' }}>
                  {c}
                </span>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={convertSelectionToPage}>Converter em página</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
