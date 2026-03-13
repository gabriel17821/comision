import { useState, useEffect, useCallback } from "react";
import {
  getVendors, saveVendor, deleteVendor, updateVendor,
  getClients, saveClient, deleteClient, updateClient
} from "@/lib/settlements";
import { pingSupabase, runPingIfDue, getPingLog, PingEntry } from "@/lib/pingSupabase";
import { Loader2, ChevronDown, ChevronUp, Wifi, WifiOff, RefreshCw } from "lucide-react";

export default function Settings() {
  const [vendors, setVendors] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newVendor, setNewVendor] = useState("");
  const [newClient, setNewClient] = useState("");

  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [editVendorName, setEditVendorName] = useState("");

  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState("");

  // --- Collapsible open states ---
  const [vendorsOpen, setVendorsOpen] = useState(true);
  const [clientsOpen, setClientsOpen] = useState(true);

  // --- Ping state ---
  const [pingLog, setPingLog] = useState<PingEntry[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [pingOpen, setPingOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const lastPing = pingLog[0] ?? null;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const fetchVendors = getVendors();
      const fetchClients = getClients();
      const delayPromise = new Promise(resolve => setTimeout(resolve, 800));

      const [vData, cData] = await Promise.all([fetchVendors, fetchClients, delayPromise]);

      setVendors(vData);
      setClients(cData);
      setIsLoading(false);

      // Auto-ping if 2 days have passed
      await runPingIfDue();
      setPingLog(getPingLog());
    };
    loadData();
  }, []);

  const handleManualPing = useCallback(async () => {
    setIsPinging(true);
    await pingSupabase();
    setPingLog(getPingLog());
    setIsPinging(false);
  }, []);

  // --- Vendor CRUD ---
  const addVendor = async () => {
    if (!newVendor.trim()) return;
    await saveVendor(newVendor);
    setVendors(await getVendors());
    setNewVendor("");
  };
  const removeVendor = async (name: string) => {
    await deleteVendor(name);
    setVendors(await getVendors());
  };
  const startEditVendor = (name: string) => { setEditingVendor(name); setEditVendorName(name); };
  const saveEditedVendor = async (oldName: string) => {
    if (editVendorName.trim() && editVendorName !== oldName) {
      await updateVendor(oldName, editVendorName);
      setVendors(await getVendors());
    }
    setEditingVendor(null);
  };

  // --- Client CRUD ---
  const addClient = async () => {
    if (!newClient.trim()) return;
    await saveClient(newClient);
    setClients(await getClients());
    setNewClient("");
  };
  const removeClient = async (name: string) => {
    await deleteClient(name);
    setClients(await getClients());
  };
  const startEditClient = (name: string) => { setEditingClient(name); setEditClientName(name); };
  const saveEditedClient = async (oldName: string) => {
    if (editClientName.trim() && editClientName !== oldName) {
      await updateClient(oldName, editClientName);
      setClients(await getClients());
    }
    setEditingClient(null);
  };

  const formatPingDate = (iso: string) =>
    new Date(iso).toLocaleString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });

  return (
    <>
      <div className="flex-1 w-full max-w-[1035px] mx-auto p-4 md:p-6 pb-8 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground animate-in fade-in duration-500">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-[15px] font-sans font-medium">Cargando ajustes...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in duration-500">

            {/* ── Vendedores (collapsible) ── */}
            <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setVendorsOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                  <h2 className="text-base font-sans font-bold text-slate-800 tracking-tight">Vendedores</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    {vendors.length} registrados
                  </span>
                </div>
                {vendorsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {vendorsOpen && (
                <div className="border-t border-border px-5 py-5 flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newVendor}
                      onChange={(e) => setNewVendor(e.target.value)}
                      placeholder="Nombre vendedor"
                      className="flex-1 px-3 py-2.5 text-sm font-sans bg-slate-50 border border-slate-200 rounded-lg focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-colors shadow-sm"
                      onKeyDown={(e) => e.key === "Enter" && addVendor()}
                    />
                    <button
                      onClick={addVendor}
                      className="px-6 py-2.5 text-[13px] font-bold tracking-wide bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-sm transition-colors uppercase"
                    >
                      Agregar
                    </button>
                  </div>
                  {vendors.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-3">Sin vendedores registrados</p>
                  ) : (
                    <ul className="divide-y divide-border border border-border rounded-md overflow-hidden max-h-[280px] overflow-y-auto">
                      {vendors.map((v) => (
                        <li key={v} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors group gap-3">
                          {editingVendor === v ? (
                            <div className="flex-1 flex items-center gap-2 w-full">
                              <input
                                type="text"
                                value={editVendorName}
                                onChange={(e) => setEditVendorName(e.target.value)}
                                className="flex-1 min-w-0 px-2 py-1.5 text-sm font-sans border border-primary/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                                onKeyDown={(e) => e.key === "Enter" && saveEditedVendor(v)}
                                autoFocus
                              />
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => saveEditedVendor(v)} className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap">Guardar</button>
                                <button onClick={() => setEditingVendor(null)} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-slate-700 flex-1 truncate">{v}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                <button onClick={() => startEditVendor(v)} className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:underline">Editar</button>
                                <button onClick={() => removeVendor(v)} className="text-xs font-semibold text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:text-red-700">Eliminar</button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* ── Clientes (collapsible) ── */}
            <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setClientsOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                  <h2 className="text-base font-sans font-bold text-slate-800 tracking-tight">Clientes</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    {clients.length} registrados
                  </span>
                </div>
                {clientsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {clientsOpen && (
                <div className="border-t border-border px-5 py-5 flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newClient}
                      onChange={(e) => setNewClient(e.target.value)}
                      placeholder="Nombre del cliente"
                      className="flex-1 px-3 py-2 text-sm font-sans bg-slate-50 border border-slate-200 rounded-md focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-colors shadow-sm"
                      onKeyDown={(e) => e.key === "Enter" && addClient()}
                    />
                    <button
                      onClick={addClient}
                      className="px-4 py-2 text-[13px] font-semibold tracking-wide bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow-sm transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                  {clients.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-3">Sin clientes registrados</p>
                  ) : (
                    <ul className="divide-y divide-border border border-border rounded-md overflow-hidden max-h-[280px] overflow-y-auto">
                      {clients.map((c) => (
                        <li key={c} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors group gap-3">
                          {editingClient === c ? (
                            <div className="flex-1 flex items-center gap-2 w-full">
                              <input
                                type="text"
                                value={editClientName}
                                onChange={(e) => setEditClientName(e.target.value)}
                                className="flex-1 min-w-0 px-2 py-1.5 text-sm font-sans border border-primary/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                                onKeyDown={(e) => e.key === "Enter" && saveEditedClient(c)}
                                autoFocus
                              />
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => saveEditedClient(c)} className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap">Guardar</button>
                                <button onClick={() => setEditingClient(null)} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-slate-700 flex-1 truncate">{c}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                <button onClick={() => startEditClient(c)} className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:underline">Editar</button>
                                <button onClick={() => removeClient(c)} className="text-xs font-semibold text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:text-red-700">Eliminar</button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* ── Conexión con Base de Datos (collapsible) ── */}
            <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setPingOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {lastPing === null ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  ) : lastPing.success ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                  )}
                  <h2 className="text-base font-sans font-bold text-slate-800 tracking-tight">
                    Conexión con Base de Datos
                  </h2>
                  {lastPing === null ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">Sin verificar</span>
                  ) : lastPing.success ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase tracking-wider">CONECTADA</span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wider">ERROR</span>
                  )}
                </div>
                {pingOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {pingOpen && (
                <div className="border-t border-border px-5 py-5 flex flex-col gap-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      {lastPing?.success ? (
                        <Wifi className="w-5 h-5 text-green-500" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {lastPing === null
                            ? "Nunca verificado"
                            : lastPing.success
                            ? `Conectada — ${lastPing.latencyMs}ms`
                            : "Error de conexión"}
                        </p>
                        {lastPing && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Último ping: {formatPingDate(lastPing.timestamp)}
                          </p>
                        )}
                        {lastPing?.error && (
                          <p className="text-xs text-red-500 mt-0.5 font-mono">{lastPing.error}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleManualPing}
                      disabled={isPinging}
                      className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin" : ""}`} />
                      {isPinging ? "Verificando..." : "Verificar ahora"}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
                    El sistema realiza una verificación automática cada <strong>2 días</strong> para mantener la base de datos activa.
                  </p>

                  {pingLog.length > 0 && (
                    <div>
                      <button
                        onClick={() => setHistoryOpen(o => !o)}
                        className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition-colors mb-3"
                      >
                        {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Historial de pings ({pingLog.length})
                      </button>
                      {historyOpen && (
                        <ul className="divide-y divide-border border border-border rounded-md overflow-hidden animate-in fade-in duration-200">
                          {pingLog.map((entry, i) => (
                            <li
                              key={i}
                              className={`flex items-center justify-between px-4 py-3 text-sm gap-4 transition-colors ${
                                entry.success ? "bg-white hover:bg-green-50/30" : "bg-red-50/40 hover:bg-red-50/60"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${entry.success ? "bg-green-500" : "bg-red-500"}`} />
                                <span className="text-slate-600 tabular-nums text-xs truncate">
                                  {formatPingDate(entry.timestamp)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {entry.success ? (
                                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">OK</span>
                                ) : (
                                  <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">ERROR</span>
                                )}
                                {entry.latencyMs !== null && (
                                  <span className="text-xs text-slate-400 font-mono w-14 text-right">{entry.latencyMs}ms</span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  );
}
