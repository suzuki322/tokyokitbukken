// 物件データの初期値・ヘルパー関数

export function emptyProperty() {
  return {
    name: "",
    propertyType: "土地",
    landNumber: "",
    residentialAddress: "",
    access: "",
    landUse: "宅地",
    landRight: "所有権",
    landArea: "",
    landAreaTsubo: "",
    road: "",
    zoning: "",
    buildingCoverage: "",
    floorAreaRatio: "",
    fireProtection: "",
    houseNumber: "",
    structure: "",
    buildingUse: "",
    totalFloorArea: "",
    builtDate: "",
    permitNumbers: "",
    floors: [{ name: "1F", area: "" }],
    price: "",
    status: "",
    handover: "相談",
    notes: "",
    rentRoll: [emptyRentRow()],
    source: "",
  };
}

export function emptyRentRow() {
  return {
    room: "",
    use: "店舗",
    areaM2: "",
    areaTsubo: "",
    rent: "",
    cam: "",
    deposit: "",
    status: "募集中",
  };
}

export function toNumber(v) {
  // 全角数字・カンマ・円記号・注記（税込 等）が混じっていても先頭の数値だけを拾う
  const normalized = String(v ?? "")
    .replace(/[０-９]/g, (d) => "0123456789"[d.charCodeAt(0) - 0xff10])
    .replace(/[^0-9.]/g, "");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function yen(v) {
  const n = toNumber(v);
  return "¥" + n.toLocaleString("ja-JP");
}

export function rentRollTotals(rentRoll) {
  const totals = rentRoll.reduce(
    (acc, r) => {
      acc.areaM2 += toNumber(r.areaM2);
      acc.areaTsubo += toNumber(r.areaTsubo);
      acc.rent += toNumber(r.rent);
      acc.cam += toNumber(r.cam);
      acc.deposit += toNumber(r.deposit);
      return acc;
    },
    { areaM2: 0, areaTsubo: 0, rent: 0, cam: 0, deposit: 0 }
  );
  totals.total = totals.rent + totals.cam;
  totals.annual = totals.total * 12;
  return totals;
}

export function surfaceYield(annualRent, price) {
  const p = toNumber(price);
  if (!p) return null;
  return (annualRent / p) * 100;
}
