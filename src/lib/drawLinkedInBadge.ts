// Shared canvas renderer for the premium neon-tech LinkedIn badge.
// Matches the AICoachPortal style: deep black bg, neon green vertical light
// strips, glassmorphism center card, circular profile with green glow,
// orange curved ribbon, name/role/company, bottom commitment + CTA pill.

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//i.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

export interface BadgeInput {
  fullName: string;
  jobRole: string;
  company: string;
  profileImage?: string;
  courseName: string;
  courseTagline?: string;
  coachName?: string;
  tag: string;            // e.g. "#AUTOMATION"
  commitmentLine: string; // bottom-left quote
  ctaLabel?: string;      // default "Join Now"
  ctaSub?: string;        // default "(Link in Post)"
}

export interface BadgeResult {
  dataUrl: string;
  taintedFallback: boolean;
}

const NEON = "#00FF99";
const ORANGE = "#FF7A00";

export const drawLinkedInBadge = async (
  canvas: HTMLCanvasElement,
  input: BadgeInput,
): Promise<BadgeResult> => {
  const W = 1080;
  const H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ===== Pure black background =====
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow from edges toward center (very faint)
  const radial = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 800);
  radial.addColorStop(0, "rgba(0,255,153,0.04)");
  radial.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, W, H);

  // Faint AI grid texture
  ctx.strokeStyle = "rgba(0,255,153,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // ===== Neon vertical light strips (left + right) =====
  const drawStrip = (x: number) => {
    const g = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
    g.addColorStop(0, "rgba(0,255,153,0)");
    g.addColorStop(0.5, "rgba(0,255,153,0.85)");
    g.addColorStop(1, "rgba(0,255,153,0)");
    ctx.fillStyle = g;
    ctx.shadowColor = NEON;
    ctx.shadowBlur = 40;
    ctx.fillRect(x - 4, 140, 8, H - 280);
    ctx.shadowBlur = 0;
    // outer soft halo
    const halo = ctx.createLinearGradient(x - 80, 0, x + 80, 0);
    halo.addColorStop(0, "rgba(0,255,153,0)");
    halo.addColorStop(0.5, "rgba(0,255,153,0.18)");
    halo.addColorStop(1, "rgba(0,255,153,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(x - 80, 140, 160, H - 280);
  };
  drawStrip(110);
  drawStrip(W - 110);

  // ===== TOP HEADER =====
  // Left: AICoachPortal monogram (rounded square with "A") + wordmark
  const logoX = 80;
  const logoY = 90;
  const logoSize = 56;
  ctx.save();
  ctx.shadowColor = "rgba(0,255,153,0.5)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = NEON;
  roundRect(ctx, logoX, logoY, logoSize, logoSize, 14);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#000000";
  ctx.font = "800 36px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", logoX + logoSize / 2, logoY + logoSize / 2 + 2);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 40px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("AICoachPortal", logoX + logoSize + 16, logoY + logoSize / 2);

  // Right: Course name (+ optional tagline + by coach)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "500 34px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  const courseLines = wrapText(ctx, input.courseName, 480);
  let topY = 130;
  courseLines.slice(0, 2).forEach((l) => {
    ctx.fillText(l, W - 80, topY);
    topY += 40;
  });
  if (input.courseTagline) {
    ctx.fillStyle = NEON;
    ctx.font = "400 20px Inter, sans-serif";
    ctx.fillText(input.courseTagline, W - 80, topY);
    topY += 28;
  }
  if (input.coachName) {
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "400 20px Inter, sans-serif";
    ctx.fillText(`By ${input.coachName}`, W - 80, topY);
  }

  // ===== CENTER GLASS CARD =====
  const cardW = 560;
  const cardH = 620;
  const cardX = (W - cardW) / 2;
  const cardY = 240;
  // glass fill
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fill();
  // glass border
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // inner top highlight
  const sheen = ctx.createLinearGradient(0, cardY, 0, cardY + 100);
  sheen.addColorStop(0, "rgba(255,255,255,0.06)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  roundRect(ctx, cardX, cardY, cardW, 120, 32);
  ctx.fill();

  // ===== Profile circle =====
  const cx = W / 2;
  const cy = cardY + 200;
  const r = 150;

  // soft outer glow
  ctx.save();
  ctx.shadowColor = "rgba(0,255,153,0.7)";
  ctx.shadowBlur = 50;
  ctx.strokeStyle = "rgba(0,255,153,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  let photoDrawn = false;
  if (input.profileImage) {
    try {
      const img = await loadImage(input.profileImage);
      // cover-fit
      const ratio = Math.max((r * 2) / img.width, (r * 2) / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      photoDrawn = true;
    } catch {
      /* fallthrough */
    }
  }
  if (!photoDrawn) {
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = NEON;
    ctx.font = "bold 130px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((input.fullName[0] || "A").toUpperCase(), cx, cy);
  }
  ctx.restore();

  // ===== Orange curved ribbon overlapping bottom of profile =====
  const ribbonCY = cy + r - 30;
  ctx.save();
  // ribbon shadow
  ctx.shadowColor = "rgba(255,122,0,0.5)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  ctx.moveTo(cx - 175, ribbonCY - 18);
  ctx.quadraticCurveTo(cx, ribbonCY + 95, cx + 175, ribbonCY - 18);
  ctx.quadraticCurveTo(cx, ribbonCY + 55, cx - 175, ribbonCY - 18);
  ctx.fill();
  ctx.restore();

  // ribbon end folds
  ctx.fillStyle = "#C24F00";
  ctx.beginPath();
  ctx.moveTo(cx - 175, ribbonCY - 18);
  ctx.lineTo(cx - 195, ribbonCY - 4);
  ctx.lineTo(cx - 168, ribbonCY - 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 175, ribbonCY - 18);
  ctx.lineTo(cx + 195, ribbonCY - 4);
  ctx.lineTo(cx + 168, ribbonCY - 2);
  ctx.closePath();
  ctx.fill();

  // Curved tag text following the ribbon arc
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 30px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tag = input.tag;
  const arcR = 200;
  const arcCenterY = ribbonCY - 80;
  // total arc span
  const totalChars = tag.length;
  const anglePerChar = 0.085; // radians
  const startAngle = -Math.PI / 2 - (anglePerChar * (totalChars - 1)) / 2;
  for (let i = 0; i < totalChars; i++) {
    const a = startAngle + i * anglePerChar;
    const tx = cx + Math.cos(a) * arcR;
    const ty = arcCenterY + Math.sin(a) * arcR;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(tag[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();

  // ===== Name / role / company (centered, inside card) =====
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "bold 46px Inter, sans-serif";
  ctx.fillText(input.fullName || "Your Name", cx, cardY + 460);

  ctx.fillStyle = "#E5E7EB";
  ctx.font = "500 28px Inter, sans-serif";
  ctx.fillText(input.jobRole || "Your Role", cx, cardY + 510);

  if (input.company) {
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "400 24px Inter, sans-serif";
    ctx.fillText(input.company, cx, cardY + 552);
  }

  // ===== Bottom Left commitment quote =====
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "500 22px Inter, sans-serif";
  ctx.textAlign = "left";
  const lines = wrapText(ctx, `"${input.commitmentLine}"`, 580);
  let qy = 940;
  lines.slice(0, 4).forEach((l) => {
    ctx.fillText(l, 80, qy);
    qy += 30;
  });

  // ===== Bottom Right CTA pill =====
  const btnW = 280;
  const btnH = 80;
  const btnX = W - 80 - btnW;
  const btnY = 940;
  ctx.save();
  ctx.shadowColor = "rgba(0,255,153,0.5)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(ctx, btnX, btnY, btnW, btnH, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = NEON;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 24px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(input.ctaLabel || "Join Now", btnX + btnW / 2, btnY + 34);
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "400 16px Inter, sans-serif";
  ctx.fillText(input.ctaSub || "(Link in Post)", btnX + btnW / 2, btnY + 60);

  try {
    return { dataUrl: canvas.toDataURL("image/png"), taintedFallback: false };
  } catch (err) {
    console.warn("Canvas tainted by remote image", err);
    return { dataUrl: "", taintedFallback: true };
  }
};
