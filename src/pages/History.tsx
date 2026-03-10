import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSettlements, deleteSettlement, formatMoney, Settlement } from "@/lib/settlements";

export default function History() {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<Settlement[]>(getSettlements);
  const [viewing, setViewing] = useState<Settlement | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const handleDelete = (id: string) => {
    deleteSettlement(id);
    setSettlements(getSettlements());
    if (viewing?.id === id) setViewing(null);
  };

  const handlePrint = (s: Settlement) => {
    setViewing(s);
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 250);
  };

  if (viewing && isPrintMode) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-[800px]">
          <p className="font-sans text-2xl font-bold">{viewing.vendedor}</p>
          <p className="font-mono text-base text-muted-foreground mt-1">Comisión: {viewing.porcentaje}%</p>
          <p className="text-xs text-muted-foreground mt-2 font-sans">
            {new Date(viewing.fecha).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <table className="w-full border-collapse mt-8">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-2 pr-4">Cliente</th>
                <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-2 pr-4">Factura</th>
                <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-2 pr-4">Cheque</th>
                <th className="text-right text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-2">Monto</th>
              </tr>
            </thead>
            <tbody>
              {viewing.facturas.map((f) => (
                <tr key={f.id} className="border-b border-border">
                  <td className="py-2 pr-4 font-sans text-sm">{f.cliente}</td>
                  <td className="py-2 pr-4 font-mono text-sm">{f.factura}</td>
                  <td className="py-2 pr-4 font-mono text-sm">{f.cheque || "—"}</td>
                  <td className="py-2 text-right font-mono text-sm tabular-nums">${formatMoney(f.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-border mt-4 pt-4">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium">Total Vendido</span>
              <span className="font-mono text-xl font-bold tabular-nums">${formatMoney(viewing.totalVendido)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium">Comisión a Pagar ({viewing.porcentaje}%)</span>
              <span className="font-mono text-2xl font-bold tabular-nums text-primary">${formatMoney(viewing.comision)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-0">
        <div className="mx-auto w-full max-w-[800px] flex items-center h-14 gap-4">
          <h1 className="text-base font-sans font-semibold text-foreground">Historial de Liquidaciones</h1>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm font-sans font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            + Nueva Liquidación
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        <div className="mx-auto w-full max-w-[800px]">
          {settlements.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-sm font-sans font-medium">Sin liquidaciones guardadas</p>
            </div>
          ) : (
            <div className="space-y-0">
              {settlements.map((s) => (
                <div key={s.id} className="border-b border-border py-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="font-sans text-base font-semibold">{s.vendedor}</p>
                      <p className="text-xs text-muted-foreground font-sans mt-1">
                        {new Date(s.fecha).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })}
                        {" · "}{s.facturas.length} factura{s.facturas.length !== 1 ? "s" : ""}
                        {" · "}{s.porcentaje}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-base font-bold tabular-nums text-primary">
                        ${formatMoney(s.comision)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">
                        de ${formatMoney(s.totalVendido)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setViewing(viewing?.id === s.id ? null : s)}
                      className="px-3 py-1.5 text-xs font-sans font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/70 transition-colors"
                    >
                      {viewing?.id === s.id ? "Ocultar" : "Ver Detalle"}
                    </button>
                    <button
                      onClick={() => handlePrint(s)}
                      className="px-3 py-1.5 text-xs font-sans font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/70 transition-colors"
                    >
                      Imprimir
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="px-3 py-1.5 text-xs font-sans font-medium text-destructive border border-destructive/30 rounded-md hover:bg-destructive/10 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>

                  {viewing?.id === s.id && (
                    <div className="mt-4 border-t border-border pt-4">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-1 pr-4">Cliente</th>
                            <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-1 pr-4">Factura</th>
                            <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-1 pr-4">Cheque</th>
                            <th className="text-right text-xs uppercase tracking-wide text-muted-foreground font-sans font-medium py-1">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.facturas.map((f) => (
                            <tr key={f.id} className="border-b border-border">
                              <td className="py-1.5 pr-4 font-sans text-sm">{f.cliente}</td>
                              <td className="py-1.5 pr-4 font-mono text-sm">{f.factura}</td>
                              <td className="py-1.5 pr-4 font-mono text-sm">{f.cheque || "—"}</td>
                              <td className="py-1.5 text-right font-mono text-sm tabular-nums">${formatMoney(f.monto)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
