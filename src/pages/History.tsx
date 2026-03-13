import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSettlements, deleteSettlement, formatMoney, Settlement } from "@/lib/settlements";
import { generateSettlementPDF } from "@/lib/pdfGenerator";
import { Loader2, Printer, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function History() {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterSeller, setFilterSeller] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Artificial delay for UI UX 
      const fetchPromise = getSettlements();
      const delayPromise = new Promise(resolve => setTimeout(resolve, 800)); // 0.8s minimum
      
      const [data] = await Promise.all([fetchPromise, delayPromise]);
      
      setSettlements(data);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteSettlement(deleteId);
    setSettlements(await getSettlements());
    setDeleteId(null);
  };

  const handlePrint = async (s: Settlement) => {
    await generateSettlementPDF(s);
  };

  const handleEdit = (s: Settlement) => {
    setIsEditing(true);
    setIsFadingOut(false);
    localStorage.setItem("calc_vendedor", s.vendedor);
    localStorage.setItem("calc_porcentaje", String(s.porcentaje));
    localStorage.setItem("calc_facturas", JSON.stringify(s.facturas));
    localStorage.setItem("calc_editing_id", s.id);
    localStorage.setItem("calc_editing_original_date", s.fecha);
    
    // Start fading out before navigation
    setTimeout(() => {
      setIsFadingOut(true);
    }, 2500);

    // Navigate when fade-out is complete (3000ms total)
    setTimeout(() => {
      navigate("/");
    }, 3000);
  };

  const formatMonthYear = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-MX", { month: 'long', year: 'numeric' }).toUpperCase();
  };

  const getMonthTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  };

  const availableMonths = Array.from(new Set(settlements.map(s => formatMonthYear(s.fecha))))
    .sort((a, b) => {
      const timeA = getMonthTime(settlements.find(s => formatMonthYear(s.fecha) === a)!.fecha);
      const timeB = getMonthTime(settlements.find(s => formatMonthYear(s.fecha) === b)!.fecha);
      return timeB - timeA;
    });

  const availableSellers = Array.from(new Set(settlements.map(s => s.vendedor))).sort();

  const filteredSettlements = settlements.filter(s => {
    const monthMatch = filterMonth === 'all' || formatMonthYear(s.fecha) === filterMonth;
    const sellerMatch = filterSeller === 'all' || s.vendedor === filterSeller;
    return monthMatch && sellerMatch;
  });

  const sortedSettlements = [...filteredSettlements].sort((a, b) => {
    if (sortBy === 'venta_desc') return b.totalVendido - a.totalVendido;
    if (sortBy === 'comision_desc') return b.comision - a.comision;
    if (sortBy === 'date_asc') return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); // default date_desc
  });

  // Grouping
  const groupedSettlements: { title: string; items: Settlement[] }[] = [];
  
  if (sortBy.startsWith('date')) {
    const groups: Record<string, Settlement[]> = {};
    sortedSettlements.forEach(s => {
      const m = formatMonthYear(s.fecha);
      if (!groups[m]) groups[m] = [];
      groups[m].push(s);
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
      const timeA = getMonthTime(groups[a][0].fecha);
      const timeB = getMonthTime(groups[b][0].fecha);
      return sortBy === 'date_asc' ? timeA - timeB : timeB - timeA;
    });

    sortedGroupKeys.forEach(m => {
      groupedSettlements.push({ title: m, items: groups[m] });
    });
  } else {
    // Top Venta / Top Comision - Single flat list block, maybe labeled by the filtered month or general
    const title = filterMonth === 'all' 
      ? (sortBy === 'venta_desc' ? "Mayor Venta" : "Mayor Comisión")
      : `${filterMonth} - ${sortBy === 'venta_desc' ? "Mayor Venta" : "Mayor Comisión"}`;
    
    if (sortedSettlements.length > 0) {
      groupedSettlements.push({ title, items: sortedSettlements });
    }
  }

  return (
    <>
      <div className="flex-1 w-full max-w-[1035px] mx-auto p-4 md:p-6 animate-in fade-in duration-500 pb-8">
        
        {/* Controls */}
        <div className="flex flex-col gap-4 mb-6 bg-white p-4 sm:p-5 border border-border rounded-xl shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Mes</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              >
                <option value="all">Todos los meses</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Vendedor</span>
              <select
                value={filterSeller}
                onChange={(e) => setFilterSeller(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              >
                <option value="all">Todos los vendedores</option>
                {availableSellers.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Ordenar por</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              >
                <option value="date_desc">Más recientes</option>
                <option value="date_asc">Más antiguos</option>
                <option value="venta_desc">Mayor Venta</option>
                <option value="comision_desc">Mayor Comisión</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground animate-in fade-in duration-500">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-[15px] font-sans font-medium">Cargando historial...</p>
          </div>
        ) : groupedSettlements.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-white border border-border rounded-lg shadow-sm">
            <p className="text-[15px] font-sans font-medium">No hay liquidaciones en el historial.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedSettlements.map((group) => (
              <div key={group.title}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-primary/20">
                    {group.title}
                  </span>
                  <div className="h-px bg-border flex-1" />
                </div>
                
                <div className="bg-white border border-border rounded-lg shadow-sm divide-y divide-border overflow-hidden">
                  {group.items.map((s) => (
                    <div key={s.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-sans text-base font-bold text-slate-900 italic">Vendedor: {s.vendedor}</h3>
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
                            <p className="font-sans text-[15px] text-slate-500 tabular-nums">Venta: ${formatMoney(s.totalVendido)}</p>
                            <p className="font-sans text-[15px] font-bold text-slate-900 tabular-nums mt-0.5">
                              Comision ({s.porcentaje}%): ${formatMoney(s.comision)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePrint(s)}
                          className="h-9 px-4 text-[13px] font-bold tracking-wide"
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Imprimir PDF
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(s)}
                          className="h-9 px-4 text-[13px] font-bold tracking-wide bg-slate-100 text-slate-700 hover:bg-slate-200 border-none"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <div className="flex-1" />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteId(s.id)}
                          className="h-9 px-4 text-[13px] font-bold tracking-wide"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Integration Overlay ── */}
      {isEditing && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500 ease-out"
          style={{
            background: "rgba(15,23,42,0.85)",
            backdropFilter: "blur(8px)",
            transition: "opacity 0.4s ease-in-out",
            opacity: isFadingOut ? 0 : 1,
            pointerEvents: isFadingOut ? "none" : "auto",
          }}
        >
          {/* Spinner */}
          <svg className="animate-spin" width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="24" stroke="#334155" strokeWidth="5" />
            <path d="M28 4a24 24 0 0 1 24 24" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" />
          </svg>
          
          <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
            <h2 className="font-bold text-white mb-2" style={{ fontSize: "22px" }}>
              Integrando Liquidación
            </h2>
            <p className="text-slate-300 font-medium" style={{ fontSize: "16px", letterSpacing: "0.01em" }}>
              cargando los datos en la calculadora....
            </p>
          </div>
        </div>
      )}

      {/* ── Deletion Confirmation ── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">¿Eliminar liquidación?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Esta acción no se puede deshacer. Se eliminará permanentemente la liquidación del historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="font-bold border-slate-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 font-bold"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
