import { useState, useRef, useCallback, useEffect } from "react";
import { Invoice, Settlement, saveSettlement, formatMoney, getVendors, saveVendor, getClients, saveClient, getDefaultVendor } from "@/lib/settlements";
import { useNavigate } from "react-router-dom";
import InlineCombobox from "@/components/InlineCombobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trash2, UserPlus, FileText, CheckCircle2, Calculator as CalcIcon, Printer, Save, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { generateSettlementPDF } from "@/lib/pdfGenerator";

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
    <span className={`${className} inline-block transition-all duration-150 ${flash ? "bg-primary/10 rounded px-1 -mx-1 scale-[1.02]" : ""}`}>
      {value}
    </span>
  );
}

export default function Calculator() {
  const navigate = useNavigate();
  const defaultVendor = getDefaultVendor();

  const [vendedor, setVendedor] = useState(() => {
    const saved = localStorage.getItem("calc_vendedor");
    return saved !== null ? saved : defaultVendor;
  });
  const [porcentaje, setPorcentaje] = useState(() => {
    return localStorage.getItem("calc_porcentaje") || "";
  });
  const [facturas, setFacturas] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem("calc_facturas");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const [showSavedDialog, setShowSavedDialog] = useState(false);
  const [savedSettlement, setSavedSettlement] = useState<Settlement | null>(null);

  const [vendors, setVendors] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setVendors(await getVendors());
      setClients(await getClients());
    };
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem("calc_vendedor", vendedor);
    localStorage.setItem("calc_porcentaje", porcentaje);
    localStorage.setItem("calc_facturas", JSON.stringify(facturas));
  }, [vendedor, porcentaje, facturas]);

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

    // Auto-scroll to bottom after state update
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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

  const editInvoice = (f: Invoice) => {
    setCliente(f.cliente);
    setFactura(f.factura);
    setCheque(f.cheque || "");
    setMonto(String(f.monto));
    removeInvoice(f.id);
  };

  const handleSaveAndPrint = async () => {
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

    await saveSettlement(settlement);
    setSavedSettlement(settlement);
    setShowSavedDialog(true);

    try {
      await generateSettlementPDF(settlement);
    } catch (e) {
      console.error("Error generating PDF:", e);
    }

    setVendedor(getDefaultVendor());
    setPorcentaje("");
    setFacturas([]);
    localStorage.removeItem("calc_vendedor");
    localStorage.removeItem("calc_porcentaje");
    localStorage.removeItem("calc_facturas");
  };

  const printSavedSettlement = async () => {
    if (!savedSettlement) return;

    try {
      await generateSettlementPDF(savedSettlement);
    } catch (e) {
      console.error("Error generating PDF:", e);
    }

    // Clean up after print dialog closes
    setVendedor(getDefaultVendor());
    setPorcentaje("");
    setFacturas([]);
  };



  const totalFormatted = `$${formatMoney(totalVendido)}`;
  const comisionFormatted = `$${formatMoney(comision)}`;

  return (
    <div className={`min-h-screen bg-muted/20 flex flex-col transition-all duration-200 pb-8`}>
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-0 sticky top-0 z-20 shadow-sm no-print">
        <div className="mx-auto w-full max-w-[800px] flex items-center h-16 gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <CalcIcon className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-lg font-sans font-bold tracking-tight text-foreground">
              Liquidación de Comisiones
            </h1>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/historial")}
            className="px-4 py-2 text-sm font-sans font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/70 transition-colors"
          >
            Historial
          </button>
          <button
            onClick={() => navigate("/configuracion")}
            className="px-4 py-2 text-sm font-sans font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/70 transition-colors"
          >
            ⚙ Config
          </button>
        </div>
      </header>

      {/* Main Container - Single Column Layout 800px */}
      <main className="flex-1 w-full max-w-[800px] mx-auto p-4 md:p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">

        {/* Vendedor & Comisión */}
        <Card className="shadow-sm border-border bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
              Datos del Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_140px] gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Vendedor
                </label>
                <InlineCombobox
                  items={vendors}
                  value={vendedor}
                  onChange={setVendedor}
                  onCreateNew={async (v) => { await saveVendor(v); setVendors(await getVendors()); }}
                  placeholder="Seleccionar o crear"
                  className="w-full px-3 py-2 font-sans text-sm bg-background border border-input rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                  onKeyDown={(e) => handleKeyDown(e, clienteRef)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Comisión %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={porcentaje}
                    placeholder="0.00"
                    onChange={(e) => setPorcentaje(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 font-mono text-sm bg-background border border-input rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow text-right"
                    onKeyDown={(e) => handleKeyDown(e, clienteRef)}
                  />
                  <span className="absolute right-3 top-2 text-muted-foreground font-mono text-sm">%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unified Invoice Data Entry & List */}
        <Card className="shadow-sm border-border border-t-4 border-t-primary bg-white relative z-10 mb-4 lg:mb-0">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="font-semibold text-left py-2.5 px-4 text-[11px] uppercase tracking-wider">Cliente</th>
                  <th className="font-semibold text-left py-2.5 px-4 text-[11px] uppercase tracking-wider w-[120px]">Factura</th>
                  <th className="font-semibold text-left py-2.5 px-4 text-[11px] uppercase tracking-wider w-[120px]">Cheque</th>
                  <th className="font-semibold text-right py-2.5 px-4 text-[11px] uppercase tracking-wider w-[140px]">Monto</th>
                  <th className="w-[100px] text-center py-2.5 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 bg-white">


                {/* Persistent Input Row (Top if empty) */}
                {facturas.length === 0 && (
                  <tr className="bg-primary/5 hover:bg-primary/5 transition-colors group">
                    <td className="p-2 align-top">
                      <InlineCombobox
                        items={clients}
                        value={cliente}
                        onChange={setCliente}
                        onCreateNew={async (c) => { await saveClient(c); setClients(await getClients()); }}
                        placeholder="Seleccionar..."
                        inputRef={clienteRef}
                        className="w-full px-3 py-2 font-sans text-sm bg-white border border-input rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
                        onKeyDown={(e) => handleKeyDown(e, facturaRef)}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <input
                        ref={facturaRef}
                        type="text"
                        value={factura}
                        onChange={(e) => setFactura(e.target.value)}
                        placeholder="Factura"
                        className="w-full px-3 py-2 font-sans text-sm bg-white border border-input rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
                        onKeyDown={(e) => handleKeyDown(e, chequeRef)}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <input
                        ref={chequeRef}
                        type="text"
                        value={cheque}
                        onChange={(e) => setCheque(e.target.value)}
                        placeholder="Cheque"
                        className="w-full px-3 py-2 font-sans text-sm bg-white border border-input rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
                        onKeyDown={(e) => handleKeyDown(e, montoRef)}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <input
                        ref={montoRef}
                        type="text"
                        inputMode="decimal"
                        value={monto}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
                            setMonto(raw);
                          }
                        }}
                        onBlur={() => {
                          const num = parseFloat(monto);
                          if (!isNaN(num) && num > 0) {
                            setMonto(num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
                          }
                        }}
                        onFocus={() => {
                          setMonto(monto.replace(/,/g, ""));
                        }}
                        placeholder="0.00"
                        className="w-full px-3 py-2 font-mono text-sm bg-white border border-input text-right rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
                        onKeyDown={(e) => handleKeyDown(e)}
                      />
                    </td>
                    <td className="p-2 align-top text-center">
                      <button
                        onClick={addInvoice}
                        className="w-full h-9 bg-primary text-primary-foreground font-sans text-[13px] font-semibold tracking-wide hover:bg-primary/90 transition-colors rounded-md shadow-sm flex items-center justify-center gap-1"
                      >
                        Agregar
                      </button>
                    </td>
                  </tr>
                )}

                {/* Historical Invoices */}
                {facturas.length > 0 ? (
                  facturas.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-medium">{f.cliente}</td>
                      <td className="py-3 px-4 text-slate-700 max-w-[120px] truncate">{f.factura}</td>
                      <td className="py-3 px-4 text-slate-700 max-w-[120px] truncate">{f.cheque || "—"}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">
                        ${formatMoney(f.monto)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => editInvoice(f)}
                            className="text-muted-foreground/50 hover:text-primary hover:bg-primary/10 p-1.5 rounded transition-colors inline-block"
                            title="Editar factura"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeInvoice(f.id)}
                            className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors inline-block"
                            title="Eliminar factura"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground border-b-0">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-200">
                          <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-[15px] font-medium text-slate-500">Aún no hay facturas</p>
                        <p className="text-sm text-slate-400 mt-1">Usa la fila de arriba para agregar la primera factura.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Persistent Input Row (Bottom when items exist) */}
                {facturas.length > 0 && (
                  <tr className="bg-primary/5 hover:bg-primary/5 transition-colors group">
                    <td className="p-2 align-top border-t border-border/50">
                      <InlineCombobox
                        items={clients}
                        value={cliente}
                        onChange={setCliente}
                        onCreateNew={async (c) => { await saveClient(c); setClients(await getClients()); }}
                        placeholder="Seleccionar..."
                        inputRef={clienteRef}
                        className="w-full px-3 py-2 font-sans text-sm bg-white border border-input rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
                        onKeyDown={(e) => handleKeyDown(e, facturaRef)}
                      />
                    </td>
                    <td className="p-2 align-top border-t border-border/50">
                      <input
                        ref={facturaRef}
                        type="text"
                        value={factura}
                        onChange={(e) => setFactura(e.target.value)}
                        placeholder="Factura"
                        className="w-full px-3 py-2 font-sans text-sm bg-white border border-input rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
                        onKeyDown={(e) => handleKeyDown(e, chequeRef)}
                      />
                    </td>
                    <td className="p-2 align-top border-t border-border/50">
                      <input
                        ref={chequeRef}
                        type="text"
                        value={cheque}
                        onChange={(e) => setCheque(e.target.value)}
                        placeholder="Cheque"
                        className="w-full px-3 py-2 font-sans text-sm bg-white border border-input rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
                        onKeyDown={(e) => handleKeyDown(e, montoRef)}
                      />
                    </td>
                    <td className="p-2 align-top border-t border-border/50">
                      <input
                        ref={montoRef}
                        type="text"
                        inputMode="decimal"
                        value={monto}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
                            setMonto(raw);
                          }
                        }}
                        onBlur={() => {
                          const num = parseFloat(monto);
                          if (!isNaN(num) && num > 0) {
                            setMonto(num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
                          }
                        }}
                        onFocus={() => {
                          setMonto(monto.replace(/,/g, ""));
                        }}
                        placeholder="0.00"
                        className="w-full px-3 py-2 font-mono text-sm bg-white border border-input text-right rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm"
                        onKeyDown={(e) => handleKeyDown(e)}
                      />
                    </td>
                    <td className="p-2 align-top text-center border-t border-border/50">
                      <button
                        onClick={addInvoice}
                        className="w-full h-9 bg-primary text-primary-foreground font-sans text-[13px] font-semibold tracking-wide hover:bg-primary/90 transition-colors rounded-md shadow-sm flex items-center justify-center gap-1"
                      >
                        Agregar
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div ref={bottomRef} className="h-4" />
          </CardContent>
        </Card>

        {/* Totals & Footer Card */}
        <Card className="shadow-sm border-border bg-white mt-4 border-t-2 border-t-muted">
          <CardContent className="p-4 sm:p-6">
            <div className="mx-auto max-w-md">
              <div className="flex justify-between items-baseline border-b border-border/60 py-2">
                <span className="font-sans text-sm font-semibold text-muted-foreground tracking-wide uppercase">
                  Total Vendido
                </span>
                <FlashValue
                  value={totalFormatted}
                  className="font-sans text-xl font-semibold tabular-nums text-foreground"
                />
              </div>
              <div className="flex justify-between items-baseline border-b-4 border-double border-border/60 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-sm font-bold text-foreground tracking-wide uppercase">
                    Comisión
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800">
                    {pct}%
                  </span>
                </div>
                <FlashValue
                  value={comisionFormatted}
                  className="font-sans text-2xl font-bold tabular-nums text-green-600"
                />
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleSaveAndPrint}
                  disabled={!locked}
                  className="w-full py-3 bg-primary text-primary-foreground font-sans text-[15px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-md shadow-sm flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Guardar e Imprimir
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Success Dialog */}
      <Dialog open={showSavedDialog} onOpenChange={setShowSavedDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center gap-4 py-6 px-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-50 duration-300 delay-150 fill-mode-both">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">¡Liquidación Guardada!</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
                La comisión de <span className="font-semibold text-foreground">{savedSettlement?.vendedor}</span> por <strong className="text-green-600">${savedSettlement ? formatMoney(savedSettlement.comision) : ""}</strong> ha sido registrada exitosamente en el historial.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-4">
              <button
                onClick={() => setShowSavedDialog(false)}
                className="flex-1 px-4 py-2.5 border border-border bg-background hover:bg-secondary transition-colors rounded-md font-medium text-sm"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setShowSavedDialog(false);
                  printSavedSettlement();
                }}
                className="flex-[2] px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Imprimir Recibo
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
