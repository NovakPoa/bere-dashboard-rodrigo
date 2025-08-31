import { useEffect, useRef } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Simplified freeform rich note editor with bold and image support
interface RichNoteEditorProps {
  html: string;
  onChange: (html: string) => void; // persist debounced
  onConvertToPage: (title: string) => Promise<string | null>; // returns new page id
  onOpenPage: (pageId: string) => void;
}

export default function RichNoteEditor({ html, onChange, onConvertToPage, onOpenPage }: RichNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  const isComposingRef = useRef(false);
  const lastHtmlRef = useRef(html);
  
  // Initial mount effect - ensure content is set immediately
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html || "";
      lastHtmlRef.current = html;
    }
  }, []); // Only on mount

  // Content sync effect - update when html changes from outside (only when not focused)
  useEffect(() => {
    if (html !== lastHtmlRef.current && editorRef.current && document.activeElement !== editorRef.current && !isComposingRef.current) {
      editorRef.current.innerHTML = html || "";
      lastHtmlRef.current = html;
    }
  }, [html]);

  // Unmount effect - flush any pending saves
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (editorRef.current) {
        const currentHtml = editorRef.current.innerHTML;
        if (currentHtml !== lastHtmlRef.current) {
          onChange(currentHtml);
        }
      }
    };
  }, [onChange]);

  // Debounced save with reduced delay for better responsiveness
  const scheduleSave = (nextHtml: string) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      onChange(nextHtml);
    }, 200);
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


  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Check file size limit (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 10MB.");
        return null;
      }

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

  const insertImageAtCursor = (imageUrl: string) => {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Imagem inserida';
    img.className = 'max-w-full h-auto rounded-lg my-2';
    
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (editorRef.current) {
      // Fallback: append to end if no selection
      editorRef.current.appendChild(img);
    }
    
    const next = editorRef.current?.innerHTML || "";
    scheduleSave(next);
  };

  const processImageFile = async (file: File) => {
    const toastId = toast.loading("Fazendo upload da imagem...");
    
    try {
      const imageUrl = await uploadImage(file);
      toast.dismiss(toastId);
      
      if (imageUrl) {
        insertImageAtCursor(imageUrl);
        toast.success("Imagem adicionada com sucesso!");
        return true;
      }
      return false;
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Erro ao processar imagem");
      return false;
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    let imageProcessed = false;

    // Method 1: Check for image files in clipboardData.files
    if (clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          await processImageFile(file);
          imageProcessed = true;
          break;
        }
      }
    }

    // Method 2: Check for image items in clipboardData.items
    if (!imageProcessed && clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        
        // Handle image files
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await processImageFile(file);
            imageProcessed = true;
            break;
          }
        }
      }
    }

    // Method 3: Check for HTML content containing images
    if (!imageProcessed) {
      const htmlData = clipboardData.getData('text/html');
      if (htmlData) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlData;
        const images = tempDiv.querySelectorAll('img');
        
        if (images.length > 0) {
          e.preventDefault();
          
          for (const img of images) {
            const src = img.src;
            if (src && (src.startsWith('data:image/') || src.startsWith('blob:'))) {
              try {
                // Convert data URL or blob URL to file
                const response = await fetch(src);
                const blob = await response.blob();
                const file = new File([blob], 'pasted-image.png', { type: blob.type });
                await processImageFile(file);
                imageProcessed = true;
                break;
              } catch (error) {
                console.error('Error processing image from HTML:', error);
              }
            }
          }
        }
      }
    }

    // If no image was processed, handle as text paste
    if (!imageProcessed) {
      e.preventDefault();
      const text = clipboardData.getData('text/plain');
      if (text) {
        document.execCommand('insertText', false, text);
        const next = editorRef.current?.innerHTML || "";
        scheduleSave(next);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          await processImageFile(file);
          break; // Process only the first image
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
    if (isComposingRef.current) return; // Don't save during composition
    
    const next = editorRef.current?.innerHTML || "";
    lastHtmlRef.current = next;
    scheduleSave(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br>&nbsp;');
      const next = editorRef.current?.innerHTML || "";
      scheduleSave(next);
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    const next = editorRef.current?.innerHTML || "";
    lastHtmlRef.current = next;
    scheduleSave(next);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === "A" && target.dataset.pageId) {
      e.preventDefault();
      e.stopPropagation();
      
      // Save current content before navigating
      if (editorRef.current) {
        const currentHtml = editorRef.current.innerHTML;
        onChange(currentHtml);
      }
      
      // Navigate to the linked page
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
          className="min-h-[320px] whitespace-pre-wrap bg-transparent px-0 py-2 focus:outline-none org-editor org-ltr"
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onClick={handleClick}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
      </ContextMenuTrigger>
      <ContextMenuContent className="z-50">
        <ContextMenuItem onSelect={applyBold}>Negrito</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={convertSelectionToPage}>Converter em página</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
