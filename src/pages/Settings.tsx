import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getVendors, saveVendor, deleteVendor,
  getClients, saveClient, deleteClient,
  getDefaultVendor, setDefaultVendor,
} from "@/lib/settlements";

export default function Settings() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [newVendor, setNewVendor] = useState("");
  const [newClient, setNewClient] = useState("");
  const [defaultVendor, setDefaultVendorState] = useState(getDefaultVendor);

  useEffect(() => {
    const loadData = async () => {
      setVendors(await getVendors());
      setClients(await getClients());
    };
    loadData();
  }, []);

  const addVendor = async () => {
    if (!newVendor.trim()) return;
    await saveVendor(newVendor);
    setVendors(await getVendors());
    setNewVendor("");
  };

  const removeVendor = async (name: string) => {
    await deleteVendor(name);
    if (defaultVendor === name) {
      setDefaultVendor("");
      setDefaultVendorState("");
    }
    setVendors(await getVendors());
  };

  const handleSetDefault = (name: string) => {
    const newDefault = defaultVendor === name ? "" : name;
    setDefaultVendor(newDefault);
    setDefaultVendorState(newDefault);
  };

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

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-0 sticky top-0 z-20 shadow-sm">
        <div className="mx-auto w-full max-w-[800px] flex items-center h-16 gap-4">
          <h1 className="text-lg font-sans font-bold tracking-tight text-foreground">
            Configuración
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

      <div className="flex-1 w-full max-w-[800px] mx-auto p-4 md:p-6 grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* Vendors */}
        <div className="bg-white border border-border rounded-lg shadow-sm p-6 relative">
          <h2 className="text-base font-sans font-bold text-slate-800 tracking-tight mb-5">Vendedores</h2>
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newVendor}
              onChange={(e) => setNewVendor(e.target.value)}
              placeholder="Nombre del vendedor"
              className="flex-1 px-3 py-2 text-sm font-sans bg-slate-50 border border-slate-200 rounded-md focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-colors shadow-sm"
              onKeyDown={(e) => e.key === "Enter" && addVendor()}
            />
            <button
              onClick={addVendor}
              className="px-4 py-2 text-[13px] font-semibold tracking-wide bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow-sm transition-colors"
            >
              Agregar
            </button>
          </div>
          {vendors.length === 0 ? (
            <p className="text-sm text-slate-500 font-sans py-4 text-center">Sin vendedores registrados</p>
          ) : (
            <ul className="space-y-2">
              {vendors.map((v) => (
                <li key={v} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-md border border-slate-100 hover:border-slate-300 transition-colors group">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSetDefault(v)}
                      className={`text-xs px-2.5 py-1 rounded-full font-sans font-medium transition-colors border ${defaultVendor === v
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      title={defaultVendor === v ? "Quitar como predeterminado" : "Marcar como predeterminado"}
                    >
                      {defaultVendor === v ? "★ Default" : "☆ Fijar"}
                    </button>
                    <span className="text-[15px] font-sans font-medium text-slate-700">{v}</span>
                  </div>
                  <button
                    onClick={() => removeVendor(v)}
                    className="text-[13px] font-semibold tracking-wide text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Clients */}
        <div className="bg-white border border-border rounded-lg shadow-sm p-6 relative">
          <h2 className="text-base font-sans font-bold text-slate-800 tracking-tight mb-5">Clientes</h2>
          <div className="flex gap-2 mb-6">
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
            <p className="text-sm text-slate-500 font-sans py-4 text-center">Sin clientes registrados</p>
          ) : (
            <ul className="space-y-2">
              {clients.map((c) => (
                <li key={c} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-md border border-slate-100 hover:border-slate-300 transition-colors group">
                  <span className="text-[15px] font-sans font-medium text-slate-700">{c}</span>
                  <button
                    onClick={() => removeClient(c)}
                    className="text-[13px] font-semibold tracking-wide text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
