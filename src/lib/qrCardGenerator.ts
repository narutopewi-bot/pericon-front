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

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRotatedAsset(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  targetWidth: number,
  centerX: number,
  centerY: number,
  angleDeg: number,
  shadowAlpha = 0.45
): void {
  if (!img || !img.width || !img.height) return;
  const targetHeight = (img.height / img.width) * targetWidth;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 8;
  ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  ctx.restore();
}

/**
 * Generates a high-resolution printable PNG table card (800x1100) with official Pericón logo,
 * emerald casino styling, fanned Spanish cards, 3D gold coins and QR code.
 */
export async function downloadRestaurantTableCardPng(opts: TableCardOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1100;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Preload official branding assets in parallel (graceful fallback if unavailable)
  const [goatLogoImg, cardSwords, cardCups, cardGoldAce, cardGoldKnight, coinsStack, coinSingle] =
    await Promise.all([
      loadImageSafe("/goat_extracted.png"),
      loadImageSafe("/cards/1_swords.png"),
      loadImageSafe("/cards/10_cups.png"),
      loadImageSafe("/cards/1_gold.png"),
      loadImageSafe("/cards/11_gold.png"),
      loadImageSafe("/mcoins.png"),
      loadImageSafe("/coins.png"),
    ]);

  // 2. Emerald casino vertical + radial glow background
  const baseGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  baseGrad.addColorStop(0, "#043f30");
  baseGrad.addColorStop(0.45, "#065f46");
  baseGrad.addColorStop(1, "#022c22");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height * 0.46;
  const radGlow = ctx.createRadialGradient(cx, cy, 30, cx, cy, 520);
  radGlow.addColorStop(0, "rgba(16, 185, 129, 0.35)");
  radGlow.addColorStop(0.55, "rgba(6, 95, 70, 0.12)");
  radGlow.addColorStop(1, "rgba(2, 44, 34, 0)");
  ctx.fillStyle = radGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Subtle golden sunburst rays behind QR
  ctx.save();
  ctx.fillStyle = "rgba(250, 204, 21, 0.055)";
  for (let i = 0; i < 18; i++) {
    const a1 = (i * 20 * Math.PI) / 180;
    const a2 = ((i * 20 + 8) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 700 * Math.cos(a1), cy + 700 * Math.sin(a1));
    ctx.lineTo(cx + 700 * Math.cos(a2), cy + 700 * Math.sin(a2));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 4. Double metallic gold frame
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(20, 20, canvas.width - 40, canvas.height - 40, 34);
  ctx.stroke();

  ctx.strokeStyle = "rgba(253, 224, 71, 0.6)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(36, 36, canvas.width - 72, canvas.height - 72, 26);
  ctx.stroke();

  // 5. Top Hero: Official Pericón goat emblem with gold halo + PERICÓN + "¡JUEGA Y GANA DINERO REAL!"
  ctx.save();
  ctx.fillStyle = "rgba(250, 204, 21, 0.22)";
  ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(139, 133, 85, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (goatLogoImg) {
    const goatW = 176;
    const goatH = goatLogoImg.width ? (goatLogoImg.height / goatLogoImg.width) * goatW : 176;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 14;
    ctx.drawImage(goatLogoImg, 52, 46, goatW, goatH);
    ctx.restore();
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fde047";
  ctx.font = "900 62px sans-serif";
  ctx.fillText("PERICÓN", 246, 102);

  ctx.fillStyle = "rgba(22, 163, 74, 0.92)";
  ctx.beginPath();
  ctx.roundRect(244, 138, 486, 44, 22);
  ctx.fill();
  ctx.strokeStyle = "#86efac";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 24px sans-serif";
  ctx.fillText("¡JUEGA Y GANA DINERO REAL!", 487, 161);

  // 6. Business pill
  ctx.fillStyle = "rgba(6, 40, 30, 0.88)";
  ctx.beginPath();
  ctx.roundRect(85, 222, 630, 64, 20);
  ctx.fill();
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 26px sans-serif";
  const bizTitle = `MESA VIP • ${opts.businessName.slice(0, 28).toUpperCase()}`;
  ctx.fillText(bizTitle, cx, 255);

  // 7. Fanned Pericón cards peeking behind QR box (100% outside QR scan area)
  drawRotatedAsset(ctx, cardSwords, 175, 145, 510, -17, 0.38);
  drawRotatedAsset(ctx, cardCups, 175, 175, 555, -8, 0.45);
  drawRotatedAsset(ctx, cardGoldAce, 175, 655, 510, 17, 0.38);
  drawRotatedAsset(ctx, cardGoldKnight, 175, 625, 555, 8, 0.45);

  // 8. Crisp white QR container
  const qrBoxSize = 410;
  const qrBoxX = (canvas.width - qrBoxSize) / 2;
  const qrBoxY = 326;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
  ctx.stroke();

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, opts.registerUrl, {
    width: 362,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
  ctx.drawImage(qrCanvas, qrBoxX + 24, qrBoxY + 24, 362, 362);

  // 9. Official 3D Gold Coins at corners
  drawRotatedAsset(ctx, coinSingle, 64, 112, 346, 22, 0.45);
  drawRotatedAsset(ctx, coinSingle, 68, 688, 342, -20, 0.45);
  drawRotatedAsset(ctx, coinSingle, 104, 122, 725, 14, 0.5);
  drawRotatedAsset(ctx, coinsStack || coinSingle, 118, 682, 720, -12, 0.5);

  // 10. Call to action & Gold Bonus Banner
  ctx.fillStyle = "#fef08a";
  ctx.font = "900 32px sans-serif";
  ctx.fillText("ESCANEA EL QR • REGÍSTRATE Y JUEGA", cx, 792);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.roundRect(75, 832, 650, 90, 24);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#fef9c3";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(75, 832, 650, 90, 24);
  ctx.stroke();

  ctx.fillStyle = "#1c0f07";
  ctx.font = "900 32px sans-serif";
  const totalWelcomeCoins = 300 + Math.max(0, opts.bonusCoinsReward || 0);
  const bonusLabel = `RECIBE ${totalWelcomeCoins} MONEDAS DE REGALO`;
  ctx.fillText(bonusLabel, cx, 878);

  // 11. Sub-CTA & Footer code pill
  ctx.fillStyle = "#6ee7b7";
  ctx.font = "800 21px sans-serif";
  ctx.fillText("100% EN VIVO EN TU TELÉFONO • RETIROS AL INSTANTE", cx, 962);

  ctx.fillStyle = "rgba(4, 34, 26, 0.88)";
  ctx.beginPath();
  ctx.roundRect(185, 996, 430, 46, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "700 21px monospace";
  ctx.fillText(`CÓDIGO: ${opts.code}  •  pericon.lat`, cx, 1020);

  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = `Tarjeta_Mesa_${opts.code}_ElPericon.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
