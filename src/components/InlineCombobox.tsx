import { useState, useRef, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

interface InlineComboboxProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  onCreateNew: (value: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  multiline?: boolean;
}

export default function InlineCombobox({
  items,
  value,
  onChange,
  onCreateNew,
  placeholder,
  className = "",
  inputRef,
  onKeyDown,
  multiline = true,
}: InlineComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || (internalRef as unknown as React.RefObject<HTMLInputElement>);
  const lastSavedVal = useRef<string>("");

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Reset interaction on input change
  useEffect(() => {
    if (inputValue.trim().length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
    setUserInteracted(false);
  }, [inputValue, items]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Recompute fixed position when open
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (wrapperRef.current) setRect(wrapperRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const openDropdown = () => {
    if (wrapperRef.current) setRect(wrapperRef.current.getBoundingClientRect());
    setOpen(true);
  };

  const filtered = inputValue.trim().length > 0
    ? items.filter((item) => item.toLowerCase().includes(inputValue.toLowerCase()))
    : [];
  
  const exactMatchValue = items.find(
    (item) => item.toLowerCase() === inputValue.trim().toLowerCase()
  );

  const totalOptions = filtered.length;

  const handleSelect = (item: string) => {
    onChange(item);
    setInputValue(item);
    setOpen(false);
    setHighlightedIndex(-1);
    setUserInteracted(false);
  };

  const triggerAutoSave = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || trimmed === lastSavedVal.current) return;
    
    // Check if it already exists in items (case insensitive)
    const exists = items.some(i => i.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;

    setSaveStatus('saving');
    lastSavedVal.current = trimmed;
    try {
      await onCreateNew(trimmed);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('idle');
      lastSavedVal.current = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 1. Navigation with arrow keys
    if (open && totalOptions > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setUserInteracted(true);
        setHighlightedIndex((i) => (i + 1) % totalOptions);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setUserInteracted(true);
        setHighlightedIndex((i) => (i - 1 + totalOptions) % totalOptions);
        return;
      }
    }

    // 2. Selection/Commit with Enter
    if (e.key === "Enter") {
      // If the dropdown is open and the user explicitly moved the highlight
      if (open && userInteracted && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        e.preventDefault();
        handleSelect(filtered[highlightedIndex]);
        // Propagate to parent to move focus
        setTimeout(() => onKeyDown?.(e), 10);
        return;
      }

      // Default: Just close dropdown and move focus
      // We do NOT trigger autosave here anymore, blur will handle it
      if (multiline) e.preventDefault(); // Prevents newline in textarea
      setOpen(false);
      const trimmed = inputValue.trim();
      if (trimmed && exactMatchValue) {
        handleSelect(exactMatchValue);
      }
      
      // Propagate Enter to parent
      onKeyDown?.(e);
      return;
    }

    if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
    }

    // Standard propagation for other keys
    onKeyDown?.(e);
  };

  const handleBlur = () => {
    // We don't close immediately to allow onMouseDown on buttons
    setTimeout(() => {
      setOpen(false);
      // TRIGGERS EXCLUSIVELY ON BLUR (leaving the field)
      triggerAutoSave(inputValue);
    }, 200);
  };

  // Auto-resize textarea height
  useEffect(() => {
    if (!multiline) return;
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [inputValue, multiline]);

  const showDropdown = open && rect && totalOptions > 0;
  const hasStatus = saveStatus !== 'idle';

  const commonProps = {
    value: inputValue,
    placeholder,
    className: `${className} font-sans transition-all duration-200 ${hasStatus ? 'pr-28' : 'pr-4'}`,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      onChange(e.target.value);
      openDropdown();
    },
    onFocus: () => { if (inputValue.trim().length > 0) openDropdown(); },
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center w-full group">
      {multiline ? (
        <textarea
          ref={ref as unknown as React.RefObject<HTMLTextAreaElement>}
          rows={1}
          {...commonProps}
          className={`${commonProps.className} resize-none overflow-hidden py-3 leading-tight`}
          style={{ minHeight: '48px' }}
        />
      ) : (
        <input
          ref={ref as unknown as React.RefObject<HTMLInputElement>}
          type="text"
          {...commonProps}
          style={{ height: '48px' }}
        />
      )}

      {/* ── Status Indicator (Compact & Dynamic) ── */}
      <div className={`absolute right-2 flex items-center justify-end pointer-events-none transition-all duration-300 ${hasStatus ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}>
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary animate-pulse bg-slate-50/90 border border-slate-100 py-1 px-2 rounded-md shadow-sm">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span className="hidden sm:inline uppercase tracking-tighter">Guardando</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50/90 border border-green-100 py-1 px-2 rounded-md shadow-sm animate-in fade-in zoom-in-95 duration-300">
            <Check className="w-3 h-3" strokeWidth={3} />
            <span className="hidden sm:inline uppercase tracking-tighter">Guardado</span>
          </div>
        )}
      </div>

      {showDropdown && rect && (
        <div
          style={{
            position: "fixed",
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-auto font-sans animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {filtered.map((item, idx) => (
            <button
              key={item}
              type="button"
              className={`w-full text-left px-4 py-3 text-[14px] text-slate-800 transition-colors font-sans ${
                idx === highlightedIndex ? "bg-primary/10 text-primary font-semibold" : "hover:bg-slate-50"
              }`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
