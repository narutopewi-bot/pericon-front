import QRCode from "qrcode";

export async function generateQrDataUrl(url: string, width = 360): Promise<string> {
  return QRCode.toDataURL(url, {
    width,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
}

export async function downloadQrOnlyPng(url: string, code: string): Promise<void> {
  const dataUrl = await generateQrDataUrl(url, 600);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `QR_${code}_pericon.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export interface TableCardOptions {
  businessName: string;
  code: string;
  bonusCoinsReward: number;
  registerUrl: string;
}

/**
 * Generates a high-resolution printable PNG table card (800x1100) ready to stick on restaurant tables.
 */
export async function downloadRestaurantTableCardPng(opts: TableCardOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1100;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#1c0f07");
  grad.addColorStop(0.5, "#0f0704");
  grad.addColorStop(1, "#1c0f07");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer gold border
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  // Inner subtle border
  ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, canvas.width - 88, canvas.height - 88);

  ctx.textAlign = "center";

  // Top brand
  ctx.fillStyle = "#fbbf24";
  ctx.font = "900 54px sans-serif";
  ctx.fillText("EL PERICÓN LLANERO", canvas.width / 2, 130);

  ctx.fillStyle = "#fde68a";
  ctx.font = "700 26px sans-serif";
  ctx.fillText("JUEGA EN TU MESA • 100% EN VIVO", canvas.width / 2, 178);

  // Business pill
  ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
  ctx.beginPath();
  ctx.roundRect(110, 215, 580, 68, 18);
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 30px sans-serif";
  ctx.fillText(opts.businessName.slice(0, 34).toUpperCase(), canvas.width / 2, 260);

  // White QR container
  const qrBoxSize = 460;
  const qrBoxX = (canvas.width - qrBoxSize) / 2;
  const qrBoxY = 320;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
  ctx.fill();
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 8;
  ctx.stroke();

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, opts.registerUrl, {
    width: 410,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
  ctx.drawImage(qrCanvas, qrBoxX + 25, qrBoxY + 25, 410, 410);

  // Call to action
  ctx.fillStyle = "#34d399";
  ctx.font = "900 38px sans-serif";
  ctx.fillText("ESCANEA EL QR Y REGÍSTRATE", canvas.width / 2, 855);

  // Bonus highlight box
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.roundRect(120, 885, 560, 82, 20);
  ctx.fill();

  ctx.fillStyle = "#1c0f07";
  ctx.font = "900 34px sans-serif";
  const bonusLabel = opts.bonusCoinsReward > 0
    ? `RECIBE +${opts.bonusCoinsReward} MONEDAS EXTRA`
    : "BONO DE BIENVENIDA ACTIVO";
  ctx.fillText(bonusLabel, canvas.width / 2, 938);

  // Footer
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 22px monospace";
  ctx.fillText(`CÓDIGO: ${opts.code}  •  pericon.lat`, canvas.width / 2, 1025);

  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = `Tarjeta_Mesa_${opts.code}_ElPericon.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
