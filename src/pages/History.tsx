import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSettlements, deleteSettlement, formatMoney, Settlement } from "@/lib/settlements";
import { generateSettlementPDF } from "@/lib/pdfGenerator";
import { Loader2 } from "lucide-react";

export default function History() {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [filterMonth, setFilterMonth] = useState<string>('all');

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

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta liquidación?")) return;
    await deleteSettlement(id);
    setSettlements(await getSettlements());
  };

  const handlePrint = async (s: Settlement) => {
    await generateSettlementPDF(s);
  };

  const handleEdit = (s: Settlement) => {
    localStorage.setItem("calc_vendedor", s.vendedor);
    localStorage.setItem("calc_porcentaje", String(s.porcentaje));
    localStorage.setItem("calc_facturas", JSON.stringify(s.facturas));
    deleteSettlement(s.id);
    navigate("/");
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

  const filteredSettlements = settlements.filter(s => filterMonth === 'all' || formatMonthYear(s.fecha) === filterMonth);

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
      <div className="flex-1 w-full max-w-[800px] mx-auto p-4 md:p-6 animate-in fade-in duration-500 pb-8">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-white p-3 border border-border rounded-lg shadow-sm">
          <div className="flex-1 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Mes:</span>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md text-[14px] font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
            >
              <option value="all">Todos los registros</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
            <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Ordenar por:</span>
            <div className="flex gap-1.5 flex-wrap">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md text-[14px] font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
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
                          <h3 className="font-sans text-base font-bold text-slate-900">Vendedor: {s.vendedor}</h3>
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
                          onClick={() => handlePrint(s)}
                          className="px-4 py-1.5 text-[13px] font-semibold tracking-wide bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          Imprimir PDF
                        </button>
                        <button
                          onClick={() => handleEdit(s)}
                          className="px-4 py-1.5 text-[13px] font-semibold tracking-wide bg-slate-700 text-white rounded-md hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          Editar
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="px-4 py-1.5 text-[13px] font-semibold tracking-wide bg-red-500 text-white hover:bg-red-600 transition-colors rounded-md shadow-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
