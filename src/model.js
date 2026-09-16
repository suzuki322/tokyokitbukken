// 物件データの初期値・ヘルパー関数

export function emptyProperty() {
  return {
    name: "",
    propertyType: "土地",
    landNumbers: [""],
    residentialAddress: "",
    access: "",
    stationText: "",
    walkText: "",
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

// 地番の配列を返す。新データは landNumbers（配列）、旧データは landNumber（文字列、
// 「、」区切り）で保存されているため、どちらにも対応する。
export function landNumbersOf(property) {
  if (Array.isArray(property?.landNumbers) && property.landNumbers.length > 0) {
    return property.landNumbers;
  }
  if (property?.landNumber) {
    const split = String(property.landNumber)
      .split(/[、,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return split.length > 0 ? split : [""];
  }
  return [""];
}

// 交通（最寄駅・徒歩分数）を { stationText, walkText } に分解する。新データは
// stationText/walkText を個別に持つが、旧データは access（自由記述の1文字列）
// のみのため、その場合は access をまるごと stationText 側に入れて表示・再編集
// できるようにする。
export function accessPartsOf(property) {
  if (property?.stationText !== undefined || property?.walkText !== undefined) {
    return {
      stationText: property.stationText || "",
      walkText: property.walkText || "",
    };
  }
  return { stationText: property?.access || "", walkText: "" };
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
