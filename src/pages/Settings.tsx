import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getVendors, saveVendor, deleteVendor,
  getClients, saveClient, deleteClient,
} from "@/lib/settlements";

export default function Settings() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<string[]>(getVendors);
  const [clients, setClients] = useState<string[]>(getClients);
  const [newVendor, setNewVendor] = useState("");
  const [newClient, setNewClient] = useState("");

  const addVendor = () => {
    if (!newVendor.trim()) return;
    saveVendor(newVendor);
    setVendors(getVendors());
    setNewVendor("");
  };

  const removeVendor = (name: string) => {
    deleteVendor(name);
    setVendors(getVendors());
  };

  const addClient = () => {
    if (!newClient.trim()) return;
    saveClient(newClient);
    setClients(getClients());
    setNewClient("");
  };

  const removeClient = (name: string) => {
    deleteClient(name);
    setClients(getClients());
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-0">
        <div className="mx-auto w-full max-w-[800px] flex items-center h-14 gap-4">
          <h1 className="text-base font-sans font-semibold text-foreground">Configuración</h1>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm font-sans font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-8">
        <div className="mx-auto w-full max-w-[800px] grid md:grid-cols-2 gap-8">
          {/* Vendors */}
          <div className="bg-card border border-border rounded-md p-5">
            <h2 className="text-sm font-sans font-semibold text-foreground uppercase tracking-wide mb-4">Vendedores</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newVendor}
                onChange={(e) => setNewVendor(e.target.value)}
                placeholder="Nombre del vendedor"
                className="flex-1 px-3 py-2 text-sm font-sans bg-background border border-border rounded-md focus:border-primary focus:shadow-[0_0_0_1px_hsl(var(--primary))]"
                onKeyDown={(e) => e.key === "Enter" && addVendor()}
              />
              <button
                onClick={addVendor}
                className="px-4 py-2 text-sm font-sans font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Agregar
              </button>
            </div>
            {vendors.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans py-4 text-center">Sin vendedores registrados</p>
            ) : (
              <ul className="space-y-1">
                {vendors.map((v) => (
                  <li key={v} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary transition-colors">
                    <span className="text-sm font-sans">{v}</span>
                    <button
                      onClick={() => removeVendor(v)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors font-sans"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Clients */}
          <div className="bg-card border border-border rounded-md p-5">
            <h2 className="text-sm font-sans font-semibold text-foreground uppercase tracking-wide mb-4">Clientes</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                placeholder="Nombre del cliente"
                className="flex-1 px-3 py-2 text-sm font-sans bg-background border border-border rounded-md focus:border-primary focus:shadow-[0_0_0_1px_hsl(var(--primary))]"
                onKeyDown={(e) => e.key === "Enter" && addClient()}
              />
              <button
                onClick={addClient}
                className="px-4 py-2 text-sm font-sans font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Agregar
              </button>
            </div>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans py-4 text-center">Sin clientes registrados</p>
            ) : (
              <ul className="space-y-1">
                {clients.map((c) => (
                  <li key={c} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary transition-colors">
                    <span className="text-sm font-sans">{c}</span>
                    <button
                      onClick={() => removeClient(c)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors font-sans"
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
    </div>
  );
}
