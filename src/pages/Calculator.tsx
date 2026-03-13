import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  getVendors, saveVendor, 
  getClients, saveClient, 
  saveSettlement, deleteSettlement,
  getDefaultVendor, formatMoney, 
  Settlement, Invoice 
} from "@/lib/settlements";
import InlineCombobox from "@/components/InlineCombobox";
import { Printer, CheckCircle2 } from "lucide-react";
import { generateSettlementPDF } from "@/lib/pdfGenerator";

function FlashValue({ value, className, style }: { value: string; className?: string; style?: React.CSSProperties }) {
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value) {
      setFlash(true);
      prevValue.current = value;
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <span
      className={`${className} inline-block`}
      style={{
        ...style,
        transition: "opacity 0.3s ease, filter 0.3s ease",
        opacity: flash ? 0.72 : 1,
        filter: flash ? "brightness(1.35)" : "brightness(1)",
      }}
    >
      {value}
    </span>
  );
}

function EditBadge({ originalDate, onCancel }: { originalDate: string; onCancel: () => void }) {
  const d = new Date(originalDate);
  const day = d.getDate();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const formatted = `${day} ${month}, ${year} - ${hours}:${minutes}${ampm}`;

  return (
    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <p className="text-[13px] font-bold text-amber-800 uppercase tracking-widest">
          Modificando Registro Previo - <span className="text-amber-600 font-sans normal-case tracking-normal ml-1">Original: {formatted}</span>
        </p>
      </div>
      <button 
        onClick={onCancel}
        className="text-[12px] font-bold text-amber-700 hover:text-amber-900 underline underline-offset-4 decoration-amber-300 transition-colors uppercase tracking-wider"
      >
        Cancelar Edición
      </button>
    </div>
  );
}

export default function Calculator() {
  const navigate = useNavigate();
  const defaultVendor = getDefaultVendor();

  const [vendedor, setVendedor] = useState(() => {
    const saved = localStorage.getItem("calc_vendedor");
    return saved !== null ? saved : defaultVendor;
  });
  const [porcentaje, setPorcentaje] = useState(() => localStorage.getItem("calc_porcentaje") || "");
  const [facturas, setFacturas] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem("calc_facturas");
    if (saved) { try { return JSON.parse(saved); } catch { return []; } }
    return [];
  });

  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "fading">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => { setVendors(await getVendors()); setClients(await getClients()); };
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem("calc_vendedor", vendedor);
    localStorage.setItem("calc_porcentaje", porcentaje);
    localStorage.setItem("calc_facturas", JSON.stringify(facturas));
  }, [vendedor, porcentaje, facturas]);

  const clienteRef = useRef<HTMLInputElement>(null);
  const facturaRef  = useRef<HTMLInputElement>(null);
  const chequeRef   = useRef<HTMLInputElement>(null);
  const montoRef    = useRef<HTMLInputElement>(null);
  // ref on the bottom entry row <tr> for auto-scroll
  const entryRowRef = useRef<HTMLTableRowElement>(null);

  const [cliente, setCliente] = useState("");
  const [factura, setFactura] = useState("");
  const [cheque,  setCheque]  = useState("");
  const [monto,   setMonto]   = useState("");

  const pct          = parseFloat(porcentaje) || 0;
  const totalVendido = facturas.reduce((sum, f) => sum + f.monto, 0);
  const comision     = totalVendido * (pct / 100);
  const locked       = vendedor.trim() !== "" && porcentaje.trim() !== "" && facturas.length > 0;

  const addInvoice = useCallback(() => {
    const montoNum = parseFloat(monto.replace(/,/g, ""));
    if (!cliente.trim() || !factura.trim() || isNaN(montoNum) || montoNum <= 0) return;
    setFacturas((prev) => [
      ...prev,
      { id: crypto.randomUUID(), cliente: cliente.trim(), factura: factura.trim(), cheque: cheque.trim(), monto: montoNum },
    ]);
    setCliente(""); setFactura(""); setCheque(""); setMonto("");
    setTimeout(() => {
      clienteRef.current?.focus();
      // scroll the entry row into center so user sees it + totals below
      entryRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, [cliente, factura, cheque, monto]);

  const removeInvoice = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      setFacturas((prev) => prev.filter((f) => f.id !== id));
      setDeletingId(null);
    }, 400); // Wait for animation
  };

  // ── Inline edit ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState({ cliente: "", factura: "", cheque: "", monto: "" });

  const startEdit = (f: Invoice) => {
    setEditingId(f.id);
    setEditRow({ cliente: f.cliente, factura: f.factura, cheque: f.cheque || "", monto: String(f.monto) });
  };
  const saveEdit = (id: string) => {
    const montoNum = parseFloat(editRow.monto.replace(/,/g, ""));
    if (!editRow.cliente.trim() || !editRow.factura.trim() || isNaN(montoNum) || montoNum <= 0) return;
    setFacturas((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, cliente: editRow.cliente.trim(), factura: editRow.factura.trim(), cheque: editRow.cheque.trim(), monto: montoNum } : f
      )
    );
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  const handleSaveAndPrint = async () => {
    if (!vendedor.trim() || facturas.length === 0) return;
    setSaveState("saving");
    const settlement: Settlement = {
      id: crypto.randomUUID(), vendedor: vendedor.trim(), porcentaje: pct,
      facturas, totalVendido, comision, fecha: new Date().toISOString(),
    };
    // Start artificial timer for UX
    const delayTimer = new Promise(resolve => setTimeout(resolve, 2000));
    
    // Non-destructive edit: Delete old record ONLY after successful new save
    const oldId = localStorage.getItem("calc_editing_id");
    
    await Promise.all([saveSettlement(settlement), delayTimer]);
    
    if (oldId) {
      try { await deleteSettlement(oldId); } catch (e) { console.error("Error deleting old settlement:", e); }
    }
    
    try { await generateSettlementPDF(settlement); } catch (e) { console.error(e); }
    // Reset form data
    setVendedor(getDefaultVendor()); setPorcentaje(""); setFacturas([]);
    localStorage.removeItem("calc_vendedor");
    localStorage.removeItem("calc_porcentaje");
    localStorage.removeItem("calc_facturas");
    localStorage.removeItem("calc_editing_id");
    localStorage.removeItem("calc_editing_original_date");
    // Show success then fade out and navigate home
    setSaveState("success");
    setTimeout(() => { setSaveState("idle"); navigate("/"); }, 3500);
  };

  // ── Shared styles ──
  const field = [
    "w-full bg-white border border-slate-300 rounded-md px-3",
    "text-[15px] text-slate-800 placeholder-slate-400",
    "focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all",
  ].join(" ");
  const fieldH = "h-[48px]";

  // ── Entry row cell group — shared inputs ──
  const entryTds = (
    <>
      <td className="px-2 py-4">
        <InlineCombobox
          items={clients} value={cliente} onChange={setCliente}
          onCreateNew={async (c) => { await saveClient(c); setClients(await getClients()); }}
          placeholder="Cliente…" inputRef={clienteRef}
          className={`${field} ${fieldH}`}
          onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); facturaRef.current?.focus(); } }}
        />
      </td>
      <td className="px-2 py-4">
        <input ref={facturaRef} type="text" value={factura} onChange={(e) => setFactura(e.target.value)}
          placeholder="Numero Fact" className={`${field} ${fieldH}`}
          onKeyDown={(e) => {
            if (e.key === "Tab")   { e.preventDefault(); chequeRef.current?.focus(); }
            if (e.key === "Enter") { e.preventDefault(); chequeRef.current?.focus(); }
          }} />
      </td>
      <td className="px-2 py-4">
        <input ref={chequeRef} type="text" value={cheque} onChange={(e) => setCheque(e.target.value)}
          placeholder="Numero Ck" className={`${field} ${fieldH}`}
          onKeyDown={(e) => {
            if (e.key === "Tab")   { e.preventDefault(); montoRef.current?.focus(); }
            if (e.key === "Enter") { e.preventDefault(); montoRef.current?.focus(); }
          }} />
      </td>
      <td className="px-2 py-4">
        <input ref={montoRef} type="text" inputMode="decimal" value={monto}
          onChange={(e) => { const r = e.target.value.replace(/[^0-9.]/g, ""); if (r === "" || /^\d*\.?\d{0,2}$/.test(r)) setMonto(r); }}
          onBlur={() => { const n = parseFloat(monto); if (!isNaN(n) && n > 0) setMonto(n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })); }}
          onFocus={() => setMonto(monto.replace(/,/g, ""))}
          placeholder="0.00"
          className={`${field} ${fieldH} text-right font-semibold`}
          style={{ fontSize: "16px" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addInvoice(); }
            if (e.key === "Tab")   { e.preventDefault(); addInvoice(); }
          }}
        />
      </td>
      <td className="px-2 py-4 w-[100px]">
        <button onClick={addInvoice}
          className="w-full border-2 border-primary text-primary font-bold rounded-md hover:bg-primary/8 active:scale-95 transition-all whitespace-nowrap"
          style={{ height: "38px", fontSize: "13px" }}>
          + Agregar
        </button>
      </td>
    </>
  );

  const trStyle = { background: "#f0f7ff", borderTop: "2px dashed #93c5fd", borderBottom: "2px dashed #93c5fd" };

  return (
    <>
      <main className="flex-1 w-full max-w-[1035px] mx-auto px-6 md:px-8 py-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-700 ease-out">

        {localStorage.getItem("calc_editing_original_date") && (
          <EditBadge 
            originalDate={localStorage.getItem("calc_editing_original_date") || ""} 
            onCancel={() => {
              localStorage.removeItem("calc_vendedor");
              localStorage.removeItem("calc_porcentaje");
              localStorage.removeItem("calc_facturas");
              localStorage.removeItem("calc_editing_id");
              localStorage.removeItem("calc_editing_original_date");
              // Clear state manually for better UX than reload
              setVendedor(getDefaultVendor());
              setPorcentaje("");
              setFacturas([]);
            }}
          />
        )}

        {/* ── Vendor strip ── */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 bg-white border border-slate-200 rounded-xl px-4 py-4 sm:px-5 sm:py-3 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <span className="text-[13px] sm:text-[14px] font-semibold text-slate-600 uppercase tracking-wider sm:normal-case sm:tracking-normal">Vendedor</span>
            <div className="w-full sm:w-[240px]">
              <InlineCombobox
                items={vendors} value={vendedor} onChange={setVendedor}
                onCreateNew={async (v) => { await saveVendor(v); setVendors(await getVendors()); }}
                placeholder="Nombre vendedor" multiline={false}
                className={`${field} ${fieldH} font-semibold text-slate-800`}
                onKeyDown={(e) => { if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); clienteRef.current?.focus(); } }}
              />
            </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-slate-200" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <span className="text-[13px] sm:text-[14px] font-semibold text-slate-600 uppercase tracking-wider sm:normal-case sm:tracking-normal">Comisión</span>
            <div className="relative w-full sm:w-[100px]">
              <input type="text" inputMode="decimal" value={porcentaje} placeholder="0.00"
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setPorcentaje(v);
                }}
                className={`${field} ${fieldH} pr-7 text-right font-semibold`}
                onKeyDown={(e) => { if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); clienteRef.current?.focus(); } }}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
            </div>
          </div>
        </div>

        {/* ── Invoice table Desktop / Card Mobile ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Mobile Entry Form (Stacked) */}
          <div className="lg:hidden p-4 bg-slate-50/50 border-b border-slate-100">
            <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-3">Nueva Factura</h3>
            <div className="flex flex-col gap-3">
              <InlineCombobox
                items={clients} value={cliente} onChange={setCliente}
                onCreateNew={async (c) => { await saveClient(c); setClients(await getClients()); }}
                placeholder="Cliente…" inputRef={clienteRef}
                className={`${field} ${fieldH}`}
                onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); facturaRef.current?.focus(); } }}
              />
              <div className="grid grid-cols-2 gap-2">
                <input ref={facturaRef} type="text" value={factura} onChange={(e) => setFactura(e.target.value)}
                  placeholder="Factura #" className={`${field} ${fieldH}`} />
                <input ref={chequeRef} type="text" value={cheque} onChange={(e) => setCheque(e.target.value)}
                  placeholder="Cheque #" className={`${field} ${fieldH}`} />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input ref={montoRef} type="text" inputMode="decimal" value={monto}
                    onChange={(e) => { const r = e.target.value.replace(/[^0-9.]/g, ""); if (r === "" || /^\d*\.?\d{0,2}$/.test(r)) setMonto(r); }}
                    onBlur={() => { const n = parseFloat(monto); if (!isNaN(n) && n > 0) setMonto(n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })); }}
                    onFocus={() => setMonto(monto.replace(/,/g, ""))}
                    placeholder="Monto 0.00"
                    className={`${field} ${fieldH} font-semibold`}
                  />
                </div>
                <button onClick={addInvoice}
                  className="px-6 bg-primary text-white font-bold rounded-md hover:bg-primary/90 transition-all">
                  Agregar
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: "#1e293b" }}>
                  <th className="text-left px-4 py-2.5 text-white font-semibold uppercase tracking-widest" style={{ fontSize: "13px" }}>Cliente</th>
                  <th className="text-left px-4 py-2.5 text-white font-semibold uppercase tracking-widest w-[138px]" style={{ fontSize: "13px" }}>Factura</th>
                  <th className="text-left px-4 py-2.5 text-white font-semibold uppercase tracking-widest w-[138px]" style={{ fontSize: "13px" }}>Cheque</th>
                  <th className="text-right px-4 py-2.5 text-white font-semibold uppercase tracking-widest w-[138px]" style={{ fontSize: "13px" }}>Monto</th>
                  <th className="w-[100px]" />
                </tr>
              </thead>
              <tbody>
                {facturas.length === 0 && (
                  <tr style={trStyle}>{entryTds}</tr>
                )}
                {facturas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-5 text-[14px] italic text-slate-400 select-none">
                      Sin facturas aún — agrega la primera arriba.
                    </td>
                  </tr>
                )}
                {facturas.map((f) => {
                  if (editingId === f.id) {
                    return (
                      <tr key={f.id} className="border-b border-slate-100 bg-blue-50/40">
                        <td className="px-2 py-2">
                          <InlineCombobox items={clients} value={editRow.cliente}
                            onChange={(v) => setEditRow((r) => ({ ...r, cliente: v }))}
                            onCreateNew={async (c) => { await saveClient(c); setClients(await getClients()); }}
                            placeholder="Cliente…" className={`${field} h-[38px]`} />
                        </td>
                        <td className="px-2 py-2">
                          <input value={editRow.factura} onChange={(e) => setEditRow((r) => ({ ...r, factura: e.target.value }))}
                            className={`${field} h-[38px]`} />
                        </td>
                        <td className="px-2 py-2">
                          <input value={editRow.cheque} onChange={(e) => setEditRow((r) => ({ ...r, cheque: e.target.value }))}
                            className={`${field} h-[38px]`} />
                        </td>
                        <td className="px-2 py-2">
                          <input value={editRow.monto}
                            onChange={(e) => { const r = e.target.value.replace(/[^0-9.]/g, ""); setEditRow((row) => ({ ...row, monto: r })); }}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(f.id); if (e.key === "Escape") cancelEdit(); }}
                            className={`${field} h-[38px] text-right font-semibold`} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => saveEdit(f.id)}
                              className="text-[14px] font-semibold text-primary hover:underline whitespace-nowrap">
                              Guardar
                            </button>
                            <button onClick={cancelEdit}
                              className="text-[14px] font-semibold text-slate-400 hover:text-slate-600 whitespace-nowrap">
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={f.id} 
                      className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-all duration-400 ease-in-out ${
                        deletingId === f.id ? "opacity-0 -translate-x-8 bg-red-50/50 pointer-events-none" : "opacity-100 translate-x-0"
                      }`}
                    >
                      <td className="px-4 py-4 font-medium text-slate-800" style={{ fontSize: "16px" }}>{f.cliente}</td>
                      <td className="px-4 py-4 text-slate-600" style={{ fontSize: "16px" }}>{f.factura}</td>
                      <td className="px-4 py-4 text-slate-500" style={{ fontSize: "16px" }}>{f.cheque || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-4 text-right font-sans font-semibold text-slate-900 tabular-nums" style={{ fontSize: "16px" }}>
                        ${formatMoney(f.monto)}
                      </td>
                      <td className="px-0 py-4 w-[100px]">
                        <div className="flex items-center gap-2 justify-end pr-2">
                          <button onClick={() => startEdit(f)}
                            className="text-[14px] font-medium text-primary hover:underline whitespace-nowrap">
                            Editar
                          </button>
                          <button onClick={() => removeInvoice(f.id)}
                            className="text-[14px] font-medium text-red-500 hover:text-red-700 whitespace-nowrap">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {facturas.length > 0 && (
                  <tr ref={entryRowRef} style={trStyle}>{entryTds}</tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Invoice List (Cards) */}
          <div className="lg:hidden flex flex-col divide-y divide-slate-100">
            {facturas.length === 0 && (
              <div className="p-10 text-center text-slate-400 italic text-sm">
                No hay facturas agregadas
              </div>
            )}
            {facturas.map((f) => (
              <div key={f.id} className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-tighter">Cliente</p>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{f.cliente}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-tighter">Monto</p>
                    <p className="text-base font-bold text-slate-900">${formatMoney(f.monto)}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-tighter">Factura</p>
                    <p className="text-sm text-slate-600">{f.factura}</p>
                  </div>
                  {f.cheque && (
                    <div>
                      <p className="text-[12px] font-bold text-slate-400 uppercase tracking-tighter">Cheque</p>
                      <p className="text-sm text-slate-600">{f.cheque}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 mt-1 pt-2 border-t border-slate-50">
                  <button onClick={() => startEdit(f)} className="text-[13px] font-bold text-primary">Editar</button>
                  <button onClick={() => removeInvoice(f.id)} className="text-[13px] font-bold text-red-500">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Restored Unified Totals Section (Responsive) ── */}
        <div className="flex flex-col lg:flex-row bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
          {/* Total Vendido */}
          <div className="flex-1 p-6 sm:p-8 lg:border-r border-slate-300">
            <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-2">Total Vendido</p>
            <FlashValue value={`$${formatMoney(totalVendido)}`}
              className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 leading-tight" />
          </div>

          {/* Comisión */}
          <div className="flex-1 p-6 sm:p-8 border-t lg:border-t-0 lg:border-r border-slate-300">
            <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Comisión{pct > 0 && <span className="text-slate-900 ml-2">({pct}%)</span>}
            </p>
            <FlashValue value={`$${formatMoney(comision)}`}
              className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 leading-tight" />
          </div>

          {/* Action Button */}
          <div className="p-5 sm:p-6 flex items-center justify-center bg-slate-50/40 border-t lg:border-t-0 border-slate-300">
            <button onClick={handleSaveAndPrint} disabled={!locked}
              className="w-full lg:w-auto px-8 h-[56px] flex items-center justify-center gap-3 bg-primary text-white font-black rounded-xl shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] uppercase tracking-wider text-[14px]"
              style={{ boxShadow: locked ? "0 8px 24px rgba(37,99,235,0.35)" : "none" }}>
              <Printer className="w-5 h-5 flex-shrink-0" />
              <span>Guardar e Imprimir</span>
            </button>
          </div>
        </div>

      </main>

      {/* ── Full-page save overlay ── */}
      {saveState !== "idle" && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500 ease-out"
          style={{
            background: "rgba(15,23,42,0.85)",
            backdropFilter: "blur(8px)",
            transition: "opacity 0.7s ease-in-out, visibility 0.7s",
            opacity: saveState === "fading" ? 0 : 1,
            pointerEvents: saveState === "fading" ? "none" : "auto",
          }}
        >
          {saveState === "saving" && (
            <>
              {/* Spinner */}
              <svg className="animate-spin" width="56" height="56" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="24" stroke="#334155" strokeWidth="5" />
                <path d="M28 4a24 24 0 0 1 24 24" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" />
              </svg>
              <p className="font-semibold text-white" style={{ fontSize: "17px", letterSpacing: "0.01em" }}>
                Guardando liquidación…
              </p>
            </>
          )}

          {(saveState === "success" || saveState === "fading") && (
            <>
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center animate-in zoom-in-90 duration-300">
                <CheckCircle2 className="w-11 h-11 text-white" strokeWidth={1.8} />
              </div>
              <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                <p className="font-bold text-white" style={{ fontSize: "22px" }}>
                  Liquidación de Comisiones
                </p>
                <p className="font-bold text-white" style={{ fontSize: "22px" }}>
                  guardada exitosamente
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
