import { useState, useRef, useCallback, useEffect } from "react";
import { Invoice, Settlement, saveSettlement, formatMoney, getVendors, saveVendor, getClients, saveClient, getDefaultVendor } from "@/lib/settlements";
import InlineCombobox from "@/components/InlineCombobox";
import { Printer, CheckCircle2 } from "lucide-react";
import { generateSettlementPDF } from "@/lib/pdfGenerator";
import { useNavigate } from "react-router-dom";

function FlashValue({ value, className, style }: { value: string; className?: string; style?: React.CSSProperties }) {
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
    <span className={`${className} inline-block transition-all duration-150 ${flash ? "scale-[1.04]" : ""}`} style={style}>
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
  const [porcentaje, setPorcentaje] = useState(() => localStorage.getItem("calc_porcentaje") || "");
  const [facturas, setFacturas] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem("calc_facturas");
    if (saved) { try { return JSON.parse(saved); } catch { return []; } }
    return [];
  });

  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "fading">("idle");
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

  const removeInvoice = (id: string) => setFacturas((prev) => prev.filter((f) => f.id !== id));

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
    await saveSettlement(settlement);
    try { await generateSettlementPDF(settlement); } catch (e) { console.error(e); }
    // Reset form data
    setVendedor(getDefaultVendor()); setPorcentaje(""); setFacturas([]);
    localStorage.removeItem("calc_vendedor");
    localStorage.removeItem("calc_porcentaje");
    localStorage.removeItem("calc_facturas");
    // Show success then fade out and navigate home
    setSaveState("success");
    setTimeout(() => setSaveState("fading"), 2800);
    setTimeout(() => { setSaveState("idle"); navigate("/"); }, 3500);
  };

  // ── Shared styles ──
  const field = [
    "w-full bg-white border border-slate-300 rounded-md px-3",
    "text-[15px] text-slate-800 placeholder-slate-400",
    "focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all",
  ].join(" ");
  const fieldH = "h-[42px]";

  // ── Entry row cell group — shared inputs ──
  const entryTds = (
    <>
      <td className="px-2 py-2">
        <InlineCombobox
          items={clients} value={cliente} onChange={setCliente}
          onCreateNew={async (c) => { await saveClient(c); setClients(await getClients()); }}
          placeholder="Cliente…" inputRef={clienteRef}
          className={`${field} ${fieldH}`}
          onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); facturaRef.current?.focus(); } }}
        />
      </td>
      <td className="px-2 py-2">
        <input ref={facturaRef} type="text" value={factura} onChange={(e) => setFactura(e.target.value)}
          placeholder="Numero Fact" className={`${field} ${fieldH}`}
          onKeyDown={(e) => {
            if (e.key === "Tab")   { e.preventDefault(); chequeRef.current?.focus(); }
            if (e.key === "Enter") { e.preventDefault(); chequeRef.current?.focus(); }
          }} />
      </td>
      <td className="px-2 py-2">
        <input ref={chequeRef} type="text" value={cheque} onChange={(e) => setCheque(e.target.value)}
          placeholder="Numero Ck" className={`${field} ${fieldH}`}
          onKeyDown={(e) => {
            if (e.key === "Tab")   { e.preventDefault(); montoRef.current?.focus(); }
            if (e.key === "Enter") { e.preventDefault(); montoRef.current?.focus(); }
          }} />
      </td>
      <td className="px-2 py-2">
        <input ref={montoRef} type="text" inputMode="decimal" value={monto}
          onChange={(e) => { const r = e.target.value.replace(/[^0-9.]/g, ""); if (r === "" || /^\d*\.?\d{0,2}$/.test(r)) setMonto(r); }}
          onBlur={() => { const n = parseFloat(monto); if (!isNaN(n) && n > 0) setMonto(n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })); }}
          onFocus={() => setMonto(monto.replace(/,/g, ""))}
          placeholder="0.00"
          className={`${field} ${fieldH} text-right font-semibold`}
          style={{ fontSize: "15px" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addInvoice(); }
            if (e.key === "Tab")   { e.preventDefault(); addInvoice(); }
          }}
        />
      </td>
      <td className="px-2 py-2">
        <button onClick={addInvoice}
          className="w-full border-2 border-primary text-primary font-semibold rounded-md hover:bg-primary/8 active:scale-95 transition-all whitespace-nowrap"
          style={{ height: "42px", fontSize: "14px", minWidth: "100px" }}>
          + Agregar
        </button>
      </td>
    </>
  );

  const trStyle = { background: "#f0f7ff", borderTop: "2px dashed #93c5fd", borderBottom: "2px dashed #93c5fd" };

  return (
    <>
      <main className="flex-1 w-full max-w-[900px] mx-auto px-6 md:px-8 py-8 flex flex-col gap-6 animate-in fade-in duration-400">

        {/* ── Vendor strip ── */}
        <div className="flex items-center gap-5 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-slate-600">Vendedor</span>
            <div className="w-[240px]">
              <InlineCombobox
                items={vendors} value={vendedor} onChange={setVendedor}
                onCreateNew={async (v) => { await saveVendor(v); setVendors(await getVendors()); }}
                placeholder="Seleccionar o crear…"
                className={`${field} ${fieldH} font-semibold text-slate-800`}
                onKeyDown={(e) => { if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); clienteRef.current?.focus(); } }}
              />
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-slate-600">Comisión</span>
            <div className="relative w-[88px]">
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

        {/* ── Invoice table ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: "#1e293b" }}>
                <th className="text-left px-4 py-2.5 text-white font-semibold uppercase tracking-widest" style={{ fontSize: "13px" }}>Cliente</th>
                <th className="text-left px-4 py-2.5 text-white font-semibold uppercase tracking-widest w-[148px]" style={{ fontSize: "13px" }}>Factura</th>
                <th className="text-left px-4 py-2.5 text-white font-semibold uppercase tracking-widest w-[148px]" style={{ fontSize: "13px" }}>Cheque</th>
                <th className="text-right px-4 py-2.5 text-white font-semibold uppercase tracking-widest w-[148px]" style={{ fontSize: "13px" }}>Monto</th>
                <th className="w-[130px]" />
              </tr>
            </thead>

            <tbody>
              {/* Entry row at TOP when empty */}
              {facturas.length === 0 && (
                <tr style={trStyle}>{entryTds}</tr>
              )}

              {/* Empty state */}
              {facturas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-5 text-[14px] italic text-slate-400 select-none">
                    Sin facturas aún — agrega la primera arriba.
                  </td>
                </tr>
              )}

              {/* Invoice rows */}
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
                            className="text-[13px] font-semibold text-primary hover:underline whitespace-nowrap">
                            Guardar
                          </button>
                          <button onClick={cancelEdit}
                            className="text-[13px] font-semibold text-slate-400 hover:text-slate-600 whitespace-nowrap">
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800" style={{ fontSize: "15px" }}>{f.cliente}</td>
                    <td className="px-4 py-3 text-slate-600" style={{ fontSize: "15px" }}>{f.factura}</td>
                    <td className="px-4 py-3 text-slate-500" style={{ fontSize: "15px" }}>{f.cheque || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-right font-sans font-semibold text-slate-900 tabular-nums" style={{ fontSize: "15px" }}>
                      ${formatMoney(f.monto)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => startEdit(f)}
                          className="text-[13px] font-medium text-primary hover:underline whitespace-nowrap">
                          Editar
                        </button>
                        <button onClick={() => removeInvoice(f.id)}
                          className="text-[13px] font-medium text-red-500 hover:text-red-700 whitespace-nowrap">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Entry row at BOTTOM — ref here for scroll */}
              {facturas.length > 0 && (
                <tr ref={entryRowRef} style={trStyle}>{entryTds}</tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Totals + Save ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-stretch divide-x divide-slate-200">

            <div className="flex-1 px-8 py-5">
              <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-2">Total Vendido</p>
              <FlashValue value={`$${formatMoney(totalVendido)}`}
                className="font-sans font-bold text-slate-800 tabular-nums" style={{ fontSize: "26px", lineHeight: "1.2" }} />
            </div>

            <div className="flex-1 px-8 py-5 bg-primary/5">
              <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Comisión{pct > 0 && <span className="ml-2 normal-case font-semibold text-slate-500">({pct}%)</span>}
              </p>
              <FlashValue value={`$${formatMoney(comision)}`}
                className="font-sans font-bold text-primary tabular-nums" style={{ fontSize: "26px", lineHeight: "1.2" }} />
            </div>

            <div className="flex items-center px-6">
              <button onClick={handleSaveAndPrint} disabled={!locked}
                className="flex items-center gap-2.5 px-7 bg-primary text-white font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-xl shadow-md whitespace-nowrap"
                style={{ fontSize: "15px", height: "52px", boxShadow: locked ? "0 4px 18px rgba(37,99,235,0.32)" : undefined }}>
                <Printer className="w-5 h-5 flex-shrink-0" />
                <span>Guardar e Imprimir</span>
              </button>
            </div>

          </div>
        </div>

      </main>

      {/* ── Full-page save overlay ── */}
      {saveState !== "idle" && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
          style={{
            background: "rgba(15,23,42,0.82)",
            backdropFilter: "blur(6px)",
            transition: "opacity 0.6s ease",
            opacity: saveState === "fading" ? 0 : 1,
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
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-11 h-11 text-white" strokeWidth={1.8} />
              </div>
              <div className="text-center">
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
