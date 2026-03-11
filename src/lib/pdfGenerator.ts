import html2pdf from "html2pdf.js";
import { Settlement, formatMoney } from "./settlements";

const createPDFContainer = (s: Settlement) => {
  const container = document.createElement("div");
  // Keep off-screen but absolute so html2canvas can read it properly without messing up the UI
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";

  // 718px width perfectly fits an A4 page inner width with 10mm margins
  container.innerHTML = `
    <div style="width: 718px; background: white; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; padding: 20px;">
      
      <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="font-size: 24px; font-weight: bold; margin: 0;">Liquidación de Comisiones</h1>
          <p style="color: #64748b; margin-top: 4px; font-size: 14px;">${new Date(s.fecha).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 18px; font-weight: bold; margin: 0;">VENDEDOR: ${s.vendedor}</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Tasa de Comisión: ${s.porcentaje}%</p>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 14px;">
        <thead>
          <tr style="border-bottom: 2px solid #1e293b;">
            <th style="text-align: left; padding: 8px 0; font-weight: bold;">Cliente</th>
            <th style="text-align: left; padding: 8px 0; font-weight: bold;">Factura</th>
            <th style="text-align: left; padding: 8px 0; font-weight: bold;">Cheque</th>
            <th style="text-align: right; padding: 8px 0; font-weight: bold;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${s.facturas.map((f, i) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0;">${f.cliente}</td>
              <td style="padding: 10px 0;">${f.factura}</td>
              <td style="padding: 10px 0;">${f.cheque || "—"}</td>
              <td style="padding: 10px 0; text-align: right;">$${formatMoney(f.monto)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; width: 100%;">
        <table style="width: 320px; border-collapse: collapse; font-size: 14px; border: 1px solid #e2e8f0;">
          <tbody>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Total Vendido:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 16px;">$${formatMoney(s.totalVendido)}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 14px 12px; font-weight: 600; color: #0f172a;">Comisión a Pagar (${s.porcentaje}%):</td>
              <td style="padding: 14px 12px; text-align: right; font-weight: bold; font-size: 18px; color: #0f172a;">$${formatMoney(s.comision)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
    </div>
  `;
  document.body.appendChild(container);
  return container;
};

const getOptions = (s: Settlement) => ({
  margin: 10,
  filename: `Liquidacion-${s.vendedor.replace(/\s+/g, "_")}-${new Date(s.fecha).toLocaleDateString("es-MX").replace(/\//g, "-")}.pdf`,
  image: { type: 'jpeg' as const, quality: 1 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    logging: false,
    scrollY: -window.scrollY
  },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
});

export const generateSettlementPDF = async (s: Settlement) => {
  const container = createPDFContainer(s);
  const opt = getOptions(s);

  try {
    await html2pdf().set(opt).from(container.firstElementChild as HTMLElement).save();
  } finally {
    document.body.removeChild(container);
  }
};

export const getSettlementPDFUrl = async (s: Settlement): Promise<string> => {
  const container = createPDFContainer(s);
  const opt = getOptions(s);

  try {
    // html2pdf's outputPdf with 'bloburl' returns the blob url string directly in modern versions
    // but the typing might lack it, so we cast to any if needed.
    const url = await (html2pdf().set(opt).from(container.firstElementChild as HTMLElement).outputPdf('bloburl') as any);
    return url as string;
  } finally {
    document.body.removeChild(container);
  }
};
