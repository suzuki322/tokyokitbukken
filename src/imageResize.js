// 写真の縮小（ブラウザ内）。長辺を maxEdge px に収め、JPEGで再エンコードする。
// スマホ写真（数MB〜十数MB）をそのままPDFに載せると重くなるため、アップロード前に縮小する。
// 向き（EXIF回転）はブラウザの標準処理で反映される。

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`「${file.name}」を画像として読み込めませんでした（JPEG・PNG・WebP・GIFに対応）。`));
    };
    img.src = url;
  });
}

export async function resizeImageToJpeg(file, { maxEdge = 1600, quality = 0.82 } = {}) {
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|gif|webp)$/i.test(file.name)) {
    throw new Error(`「${file.name}」は画像ではありません。`);
  }
  const img = await loadImage(file);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  if (!w0 || !h0) throw new Error(`「${file.name}」を画像として読み込めませんでした。`);
  const scale = Math.min(1, maxEdge / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // 透過PNGは黒く潰れないよう白背景に敷く
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error(`「${file.name}」の変換に失敗しました。`);

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
