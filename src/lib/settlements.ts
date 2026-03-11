import { supabase } from "./supabase";

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

// --- Default Vendor ---
export function getDefaultVendor(): string {
  return localStorage.getItem("vendedor_default") || "";
}

export function setDefaultVendor(name: string) {
  localStorage.setItem("vendedor_default", name);
}

// --- Vendors ---
export async function getVendors(): Promise<string[]> {
  const { data, error } = await supabase.from('vendors').select('name').order('name');
  if (error) {
    console.error("Error fetching vendors:", error);
    return [];
  }
  return data.map(v => v.name);
}

export async function saveVendor(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { error } = await supabase.from('vendors').insert([{ name: trimmed }]);
  if (error) console.error("Error saving vendor:", error);
}

export async function deleteVendor(name: string) {
  const { error } = await supabase.from('vendors').delete().eq('name', name);
  if (error) console.error("Error deleting vendor:", error);
}

// --- Clients ---
export async function getClients(): Promise<string[]> {
  const { data, error } = await supabase.from('clients').select('name').order('name');
  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
  return data.map(c => c.name);
}

export async function saveClient(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { error } = await supabase.from('clients').insert([{ name: trimmed }]);
  if (error) console.error("Error saving client:", error);
}

export async function deleteClient(name: string) {
  const { error } = await supabase.from('clients').delete().eq('name', name);
  if (error) console.error("Error deleting client:", error);
}

// --- Settlements ---
export async function getSettlements(): Promise<Settlement[]> {
  const { data, error } = await supabase.from('settlements').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error("Error fetching settlements:", error);
    return [];
  }

  return data.map(dbRow => ({
    id: dbRow.id,
    vendedor: dbRow.vendedor,
    porcentaje: Number(dbRow.porcentaje),
    facturas: Array.isArray(dbRow.facturas) ? dbRow.facturas : JSON.parse(dbRow.facturas),
    totalVendido: Number(dbRow.total_vendido),
    comision: Number(dbRow.comision),
    fecha: dbRow.fecha // or dbRow.created_at
  }));
}

export async function saveSettlement(settlement: Settlement) {
  const { error } = await supabase.from('settlements').insert([{
    id: settlement.id,
    vendedor: settlement.vendedor,
    porcentaje: settlement.porcentaje,
    facturas: settlement.facturas,
    total_vendido: settlement.totalVendido,
    comision: settlement.comision,
    fecha: settlement.fecha
  }]);

  if (error) console.error("Error saving settlement:", error);
}

export async function deleteSettlement(id: string) {
  const { error } = await supabase.from('settlements').delete().eq('id', id);
  if (error) console.error("Error deleting settlement:", error);
}

export function formatMoney(n: number): string {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
