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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || internalRef;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = items.filter((item) =>
    item.toLowerCase().includes(inputValue.toLowerCase())
  );

  const exactMatch = items.some(
    (item) => item.toLowerCase() === inputValue.trim().toLowerCase()
  );

  const handleSelect = (item: string) => {
    onChange(item);
    setInputValue(item);
    setOpen(false);
  };

  const handleCreate = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onCreateNew(trimmed);
      onChange(trimmed);
      setOpen(false);
    }
  };

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
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          }
          onKeyDown?.(e);
        }}
      />
      {open && (filtered.length > 0 || (inputValue.trim() && !exactMatch)) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-auto">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              className="w-full text-left px-3 py-2 text-sm font-sans hover:bg-secondary transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
            >
              {item}
            </button>
          ))}
          {inputValue.trim() && !exactMatch && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm font-sans text-primary font-medium hover:bg-secondary transition-colors border-t border-border"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              + Crear "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
