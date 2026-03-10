import { useState, useRef, useCallback, useEffect } from "react";
import { Invoice, Settlement, saveSettlement, formatMoney, getVendors, saveVendor, getClients, saveClient, getDefaultVendor } from "@/lib/settlements";
import { useNavigate } from "react-router-dom";
import InlineCombobox from "@/components/InlineCombobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function FlashValue({ value, className }: { value: string; className?: string }) {
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setFlash(true);
      prevValue.current = value;
      const t = setTimeout(() => setFlash(false), 400);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`${className} inline-block transition-all duration-150 ${flash ? "bg-primary/15 rounded px-1 -mx-1 scale-105" : ""}`}>
      {value}
    </span>
  );
}

export default function Calculator() {
  const navigate = useNavigate();
  const defaultVendor = getDefaultVendor();
  const [vendedor, setVendedor] = useState(defaultVendor);
  const [porcentaje, setPorcentaje] = useState("");
  const [facturas, setFacturas] = useState<Invoice[]>([]);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [showSavedDialog, setShowSavedDialog] = useState(false);
  const [savedSettlement, setSavedSettlement] = useState<Settlement | null>(null);

  const [vendors, setVendors] = useState<string[]>(getVendors);
  const [clients, setClients] = useState<string[]>(getClients);

  const clienteRef = useRef<HTMLInputElement>(null);
  const facturaRef = useRef<HTMLInputElement>(null);
  const chequeRef = useRef<HTMLInputElement>(null);
  const montoRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [cliente, setCliente] = useState("");
  const [factura, setFactura] = useState("");
  const [cheque, setCheque] = useState("");
  const [monto, setMonto] = useState("");

  const pct = parseFloat(porcentaje) || 0;
  const totalVendido = facturas.reduce((sum, f) => sum + f.monto, 0);
  const comision = totalVendido * (pct / 100);

  const locked = vendedor.trim() !== "" && porcentaje.trim() !== "" && facturas.length > 0;

  const addInvoice = useCallback(() => {
    const montoNum = parseFloat(monto.replace(/,/g, ""));
    if (!cliente.trim() || !factura.trim() || isNaN(montoNum) || montoNum <= 0) return;

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      cliente: cliente.trim(),
      factura: factura.trim(),
      cheque: cheque.trim(),
      monto: montoNum,
    };

    setFacturas((prev) => [...prev, newInvoice]);
    setCliente("");
    setFactura("");
    setCheque("");
    setMonto("");
    clienteRef.current?.focus();
    // Scroll down after adding
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  }, [cliente, factura, cheque, monto]);

  const removeInvoice = (id: string) => {
    setFacturas((prev) => prev.filter((f) => f.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextRef) {
        nextRef.current?.focus();
      } else {
        addInvoice();
      }
    }
  };

  const handlePrint = () => {
    if (!vendedor.trim() || facturas.length === 0) return;
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 250);
  };

  const handleSave = () => {
    if (!vendedor.trim() || facturas.length === 0) return;

    const settlement: Settlement = {
      id: crypto.randomUUID(),
      vendedor: vendedor.trim(),
      porcentaje: pct,
      facturas,
      totalVendido,
      comision,
      fecha: new Date().toISOString(),
    };

    saveSettlement(settlement);
    setSavedSettlement(settlement);
    setShowSavedDialog(true);
    setVendedor(getDefaultVendor());
    setPorcentaje("");
    setFacturas([]);
  };

  const totalFormatted = `$${formatMoney(totalVendido)}`;
  const comisionFormatted = `$${formatMoney(comision)}`;

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-200 ${isPrintMode ? "print-active" : ""}`}>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-0 sticky top-0 z-10">
        <div className="mx-auto w-full max-w-[800px] flex items-center h-14 gap-4">
          <h1 className="text-base font-sans font-semibold text-foreground">
            Liquidación de Comisiones
          </h1>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/historial")}
            className="px-4 py-2 text-sm font-sans font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/70 transition-colors no-print"
          >
            Historial
          </button>
          <button
            onClick={() => navigate("/configuracion")}
            className="px-4 py-2 text-sm font-sans font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/70 transition-colors no-print"
          >
            ⚙ Config
          </button>
        </div>
      </header>

      {/* Vendor / Commission — separate section */}
      {!isPrintMode ? (
        <div className="border-b-2 border-primary/20 px-4 py-5 bg-card">
          <div className="mx-auto w-full max-w-[800px]">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans font-semibold mb-3">Datos del Vendedor</p>
            <div className="grid grid-cols-[1fr_140px] gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-sans font-medium">
                  Vendedor
                </label>
                <InlineCombobox
                  items={vendors}
                  value={vendedor}
                  onChange={setVendedor}
                  onCreateNew={(v) => { saveVendor(v); setVendors(getVendors()); }}
                  placeholder="Seleccionar o crear vendedor"
                  className="w-full px-3 py-2 font-sans text-sm bg-background border border-border rounded-md focus:border-primary focus:shadow-[0_0_0_1px_hsl(var(--primary))]"
                  onKeyDown={(e) => handleKeyDown(e, clienteRef)}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-sans font-medium">
                  Comisión %
                </label>
                <input
                  type="number"
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-sm bg-background border border-border text-right rounded-md focus:border-primary focus:shadow-[0_0_0_1px_hsl(var(--primary))]"
                  onKeyDown={(e) => handleKeyDown(e, clienteRef)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-6">
          <div className="mx-auto w-full max-w-[800px]">
            <p className="font-sans text-2xl font-bold">{vendedor}</p>
            <p className="font-mono text-base text-muted-foreground mt-1">Comisión: {pct}%</p>
            <p className="text-xs text-muted-foreground mt-2 font-sans">
              {new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      )}

      {/* Scrollable content: Table + Input row at bottom */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="mx-auto w-full max-w-[800px]">
          {/* Invoice Table */}
          {facturas.length > 0 && (
            <table className="w-full border-collapse mb-4">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-2.5 pr-4">
                    Cliente
                  </th>
                  <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-2.5 pr-4">
                    Factura
                  </th>
                  <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-2.5 pr-4">
                    Cheque
                  </th>
                  <th className="text-right text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-2.5">
                    Monto
                  </th>
                  {!isPrintMode && <th className="w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => (
                  <tr key={f.id} className="border-b border-border animate-row-enter">
                    <td className="py-2.5 pr-4 font-sans text-sm">{f.cliente}</td>
                    <td className="py-2.5 pr-4 font-mono text-sm">{f.factura}</td>
                    <td className="py-2.5 pr-4 font-mono text-sm">{f.cheque || "—"}</td>
                    <td className="py-2.5 text-right font-mono text-sm tabular-nums">
                      ${formatMoney(f.monto)}
                    </td>
                    {!isPrintMode && (
                      <td className="py-2.5 text-right no-print">
                        <button
                          onClick={() => removeInvoice(f.id)}
                          className="text-muted-foreground hover:text-destructive text-xs transition-colors"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Input Row — BELOW the table, scrolls down with content */}
          {!isPrintMode && (
            <div className="border border-border rounded-md px-4 py-4 bg-secondary/20 no-print" ref={bottomRef}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans font-semibold mb-3">Agregar Factura</p>
              <div className="grid grid-cols-[1fr_100px_100px_120px_auto] gap-3 items-end">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-sans font-medium">
                    Cliente
                  </label>
                  <InlineCombobox
                    items={clients}
                    value={cliente}
                    onChange={setCliente}
                    onCreateNew={(c) => { saveClient(c); setClients(getClients()); }}
                    placeholder="Seleccionar o crear"
                    inputRef={clienteRef}
                    className="w-full px-3 py-2 font-sans text-sm bg-background border border-border rounded-md focus:border-primary focus:shadow-[0_0_0_1px_hsl(var(--primary))]"
                    onKeyDown={(e) => handleKeyDown(e, facturaRef)}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-sans font-medium">
                    Factura
                  </label>
                  <input
                    ref={facturaRef}
                    type="text"
                    value={factura}
                    onChange={(e) => setFactura(e.target.value)}
                    className="w-full px-3 py-2 font-sans text-sm bg-background border border-border rounded-md focus:border-primary focus:shadow-[0_0_0_1px_hsl(var(--primary))]"
                    onKeyDown={(e) => handleKeyDown(e, chequeRef)}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-sans font-medium">
                    Cheque
                  </label>
                  <input
                    ref={chequeRef}
                    type="text"
                    value={cheque}
                    onChange={(e) => setCheque(e.target.value)}
                    className="w-full px-3 py-2 font-sans text-sm bg-background border border-border rounded-md focus:border-primary focus:shadow-[0_0_0_1px_hsl(var(--primary))]"
                    onKeyDown={(e) => handleKeyDown(e, montoRef)}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-sans font-medium">
                    Monto
                  </label>
                  <input
                    ref={montoRef}
                    type="text"
                    inputMode="decimal"
                    value={monto}
                    onChange={(e) => {
                      // Allow digits, commas, and one dot
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
                        setMonto(raw);
                      }
                    }}
                    onBlur={() => {
                      // Format with commas on blur
                      const num = parseFloat(monto);
                      if (!isNaN(num) && num > 0) {
                        setMonto(num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
                      }
                    }}
                    onFocus={() => {
                      // Remove commas on focus for editing
                      setMonto(monto.replace(/,/g, ""));
                    }}
                    className="w-full px-3 py-2 font-sans text-sm bg-background border border-border text-right rounded-md focus:border-primary focus:shadow-[0_0_0_1px_hsl(var(--primary))]"
                    onKeyDown={(e) => handleKeyDown(e)}
                    placeholder="0.00"
                  />
                </div>
                <button
                  onClick={addInvoice}
                  className="px-5 py-2 bg-primary text-primary-foreground font-sans text-sm font-medium hover:bg-primary/90 transition-colors rounded-md shadow-sm"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          {facturas.length === 0 && !isPrintMode && (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm font-sans font-medium">Agrega facturas usando el formulario de arriba</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Totals — estilo cuaderno de colegio */}
      <footer className="border-t-2 border-foreground/30 bg-background sticky bottom-0 z-10">
        <div className="w-full px-6 py-5">
          {/* Total Vendido */}
          <div className="flex justify-between items-baseline border-b border-foreground/15 py-3 px-2">
            <span className="font-sans text-base font-medium text-foreground tracking-wide">
              Total Vendido
            </span>
            <FlashValue
              value={totalFormatted}
              className="font-mono text-2xl font-bold tabular-nums text-foreground"
            />
          </div>
          {/* Línea doble para comisión */}
          <div className="flex justify-between items-baseline border-b-4 border-double border-foreground/30 py-3 px-2">
            <span className="font-sans text-base font-semibold text-foreground tracking-wide">
              Comisión a Pagar ({pct}%)
            </span>
            <FlashValue
              value={comisionFormatted}
              className="font-mono text-3xl font-bold tabular-nums text-primary"
            />
          </div>

          {!isPrintMode && (
            <div className="flex gap-3 mt-4 no-print max-w-[800px] mx-auto">
              <button
                onClick={handleSave}
                disabled={!locked}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-sans text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-30 rounded-md shadow-sm"
              >
                Guardar Liquidación
              </button>
              <button
                onClick={handlePrint}
                disabled={facturas.length === 0 || !vendedor.trim()}
                className="px-4 py-3 border border-border font-sans text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-30 rounded-md"
              >
                Imprimir
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* Dialog de guardado exitoso */}
      <Dialog open={showSavedDialog} onOpenChange={setShowSavedDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-50 duration-300">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-sans font-semibold text-foreground">¡Liquidación Guardada!</h2>
            <p className="text-sm text-muted-foreground font-sans">
              {savedSettlement?.vendedor} — {savedSettlement ? `$${formatMoney(savedSettlement.comision)}` : ""}
            </p>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setShowSavedDialog(false)}
                className="flex-1 px-4 py-3 border border-border font-sans text-sm font-medium hover:bg-secondary transition-colors rounded-md"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setShowSavedDialog(false);
                  // Re-load settlement for print
                  setVendedor(savedSettlement?.vendedor || "");
                  setPorcentaje(String(savedSettlement?.porcentaje || ""));
                  setFacturas(savedSettlement?.facturas || []);
                  setTimeout(() => handlePrint(), 100);
                }}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-sans text-sm font-medium hover:bg-primary/90 transition-colors rounded-md shadow-sm"
              >
                🖨 Imprimir
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
