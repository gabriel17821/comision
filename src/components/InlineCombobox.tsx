import { useState, useRef, useEffect } from "react";

interface InlineComboboxProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  onCreateNew: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
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
}: InlineComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || internalRef;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Reset highlight when list changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [inputValue]);

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
  const exactMatch = items.some(
    (item) => item.toLowerCase() === inputValue.trim().toLowerCase()
  );

  // All selectable options including "create new"
  const showCreate = inputValue.trim().length > 0 && !exactMatch;
  const totalOptions = filtered.length + (showCreate ? 1 : 0);

  const handleSelect = (item: string) => {
    onChange(item);
    setInputValue(item);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleCreate = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onCreateNew(trimmed);
      onChange(trimmed);
      setOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (open && totalOptions > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % totalOptions);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + totalOptions) % totalOptions);
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        if (highlightedIndex < filtered.length) {
          handleSelect(filtered[highlightedIndex]);
        } else {
          handleCreate();
        }
        return;
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
    }
    onKeyDown?.(e);
  };

  const showDropdown = open && rect && totalOptions > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={ref}
        type="text"
        value={inputValue}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          openDropdown();
        }}
        onFocus={() => { if (inputValue.trim().length > 0) openDropdown(); }}
        onKeyDown={handleKeyDown}
      />

      {showDropdown && rect && (
        <div
          style={{
            position: "fixed",
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-auto"
        >
          {filtered.map((item, idx) => (
            <button
              key={item}
              type="button"
              className={`w-full text-left px-3 py-2.5 text-[14px] text-slate-800 transition-colors ${
                idx === highlightedIndex ? "bg-primary/10 text-primary" : "hover:bg-slate-50"
              }`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              {item}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              className={`w-full text-left px-3 py-2.5 text-[14px] font-semibold border-t border-slate-100 transition-colors ${
                highlightedIndex === filtered.length ? "bg-primary/10 text-primary" : "text-primary hover:bg-primary/5"
              }`}
              onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
              onMouseEnter={() => setHighlightedIndex(filtered.length)}
            >
              + Crear "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
