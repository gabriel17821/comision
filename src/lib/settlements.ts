export interface Invoice {
  id: string;
  cliente: string;
  factura: string;
  cheque: string;
  monto: number;
}

export interface Settlement {
  id: string;
  vendedor: string;
  porcentaje: number;
  facturas: Invoice[];
  totalVendido: number;
  comision: number;
  fecha: string;
}

// --- Vendors ---
export function getVendors(): string[] {
  const data = localStorage.getItem("vendedores");
  return data ? JSON.parse(data) : [];
}

export function saveVendor(name: string) {
  const all = getVendors();
  const trimmed = name.trim();
  if (trimmed && !all.includes(trimmed)) {
    all.push(trimmed);
    all.sort((a, b) => a.localeCompare(b));
    localStorage.setItem("vendedores", JSON.stringify(all));
  }
}

export function deleteVendor(name: string) {
  const all = getVendors().filter((v) => v !== name);
  localStorage.setItem("vendedores", JSON.stringify(all));
}

// --- Clients ---
export function getClients(): string[] {
  const data = localStorage.getItem("clientes");
  return data ? JSON.parse(data) : [];
}

export function saveClient(name: string) {
  const all = getClients();
  const trimmed = name.trim();
  if (trimmed && !all.includes(trimmed)) {
    all.push(trimmed);
    all.sort((a, b) => a.localeCompare(b));
    localStorage.setItem("clientes", JSON.stringify(all));
  }
}

export function deleteClient(name: string) {
  const all = getClients().filter((c) => c !== name);
  localStorage.setItem("clientes", JSON.stringify(all));
}

// --- Settlements ---
export function getSettlements(): Settlement[] {
  const data = localStorage.getItem("liquidaciones");
  return data ? JSON.parse(data) : [];
}

export function saveSettlement(settlement: Settlement) {
  const all = getSettlements();
  all.unshift(settlement);
  localStorage.setItem("liquidaciones", JSON.stringify(all));
}

export function deleteSettlement(id: string) {
  const all = getSettlements().filter((s) => s.id !== id);
  localStorage.setItem("liquidaciones", JSON.stringify(all));
}

export function formatMoney(n: number): string {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
