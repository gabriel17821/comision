import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSettlements, deleteSettlement, formatMoney, Settlement } from "@/lib/settlements";
import { generateSettlementPDF, getSettlementPDFUrl } from "@/lib/pdfGenerator";
import { Loader2 } from "lucide-react";

export default function History() {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [viewing, setViewing] = useState<Settlement | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setSettlements(await getSettlements());
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta liquidación?")) return;
    await deleteSettlement(id);
    setSettlements(await getSettlements());
    if (viewing?.id === id) setViewing(null);
  };

  const handlePrint = async (s: Settlement) => {
    await generateSettlementPDF(s);
  };

  const handleViewDetail = async (s: Settlement) => {
    if (viewing?.id === s.id) {
      setViewing(null);
      setPdfUrl(null);
    } else {
      setViewing(s);
      setIsPdfLoading(true);
      setPdfUrl(null);

      try {
        const url = await getSettlementPDFUrl(s);
        setPdfUrl(url);
      } catch (err) {
        console.error("Error al generar vista previa:", err);
      } finally {
        setIsPdfLoading(false);
      }
    }
  };

  const handleEdit = (s: Settlement) => {
    localStorage.setItem("calc_vendedor", s.vendedor);
    localStorage.setItem("calc_porcentaje", String(s.porcentaje));
    localStorage.setItem("calc_facturas", JSON.stringify(s.facturas));
    deleteSettlement(s.id);
    navigate("/");
  };



  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-0 sticky top-0 z-20 shadow-sm">
        <div className="mx-auto w-full max-w-[800px] flex items-center h-16 gap-4">
          <h1 className="text-lg font-sans font-bold tracking-tight text-foreground">
            Historial
          </h1>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm font-sans font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/70 transition-colors"
          >
            ← Volver a Calculadora
          </button>
        </div>
      </header>

      <div className="flex-1 w-full max-w-[800px] mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
        {settlements.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-white border border-border rounded-lg shadow-sm">
            <p className="text-[15px] font-sans font-medium">No hay liquidaciones en el historial.</p>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-lg shadow-sm divide-y divide-border">
            {settlements.map((s) => (
              <div key={s.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-sans text-base font-bold text-slate-900">{s.vendedor}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {new Date(s.fecha).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })}
                      <span className="mx-2">•</span>
                      {s.facturas.length} factura{s.facturas.length !== 1 ? "s" : ""}
                      <span className="mx-2">•</span>
                      {s.porcentaje}% Comisión
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                    <div className="text-left sm:text-right">
                      <p className="font-sans text-sm text-slate-500 tabular-nums">Venta: ${formatMoney(s.totalVendido)}</p>
                      <p className="font-sans text-[15px] font-bold text-green-600 tabular-nums mt-0.5">
                        Comision ({s.porcentaje}%): ${formatMoney(s.comision)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleViewDetail(s)}
                    className="px-4 py-1.5 text-[13px] font-semibold tracking-wide bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                  >
                    {viewing?.id === s.id ? "Ocultar Detalle" : "Ver Detalle PDF"}
                  </button>
                  <button
                    onClick={() => handlePrint(s)}
                    className="px-4 py-1.5 text-[13px] font-semibold tracking-wide bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Imprimir PDF
                  </button>
                  <button
                    onClick={() => handleEdit(s)}
                    className="px-4 py-1.5 text-[13px] font-semibold tracking-wide bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100 transition-colors"
                  >
                    Editar
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-4 py-1.5 text-[13px] font-semibold tracking-wide text-red-600 bg-red-50 hover:bg-red-100 transition-colors rounded-md"
                  >
                    Eliminar
                  </button>
                </div>

                {viewing?.id === s.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/80 rounded-b-md p-4 flex flex-col items-center justify-center min-h-[400px]">
                    {isPdfLoading ? (
                      <div className="flex flex-col items-center text-muted-foreground gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium">Generando vista previa del PDF...</p>
                      </div>
                    ) : pdfUrl ? (
                      <iframe
                        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="w-full h-[600px] border border-slate-200 shadow-sm rounded-md bg-white"
                        title="Vista Previa PDF"
                      />
                    ) : (
                      <p className="text-sm text-red-500">Error al cargar la vista previa.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
