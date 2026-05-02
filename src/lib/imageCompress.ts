// Client-side image compression utility.
// Compresses an uploaded image to under ~100 KB by iteratively reducing
// dimensions and JPEG quality. Returns a base64 data URL (image/jpeg).

const TARGET_BYTES = 100 * 1024; // 100 KB
const MAX_DIMENSION = 1024;

const dataUrlByteSize = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.floor((base64.length * 3) / 4);
};

const fileToImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const compressImage = async (file: File): Promise<string> => {
  const img = await fileToImage(file);

  let width = img.width;
  let height = img.height;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.9;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  // Reduce quality first
  while (dataUrlByteSize(dataUrl) > TARGET_BYTES && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  // If still too large, downscale and retry
  while (dataUrlByteSize(dataUrl) > TARGET_BYTES && width > 256) {
    width = Math.round(width * 0.85);
    height = Math.round(height * 0.85);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    quality = 0.8;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrlByteSize(dataUrl) > TARGET_BYTES && quality > 0.4) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
  }

  return dataUrl;
};

export const getDataUrlSizeKB = (dataUrl: string) =>
  Math.round(dataUrlByteSize(dataUrl) / 1024);
