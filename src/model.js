// 物件データの初期値・ヘルパー関数

// 前面道路の方角区分（フォーム・表示の両方で共有）。
export const ROAD_DIRECTIONS = [
  { key: "north", label: "北側" },
  { key: "east", label: "東側" },
  { key: "south", label: "南側" },
  { key: "west", label: "西側" },
];

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
    landAreaPublic: "",
    landAreaSurveyed: "",
    roads: { north: "", east: "", south: "", west: "" },
    zoning: "",
    buildingCoverage: "",
    floorAreaRatio: "",
    fireProtection: "",
    buildings: [emptyBuilding()],
    price: "",
    annualIncome: "",
    status: "",
    handover: "相談",
    dealType: "",
    contactPerson: "",
    notes: "",
    rentRoll: [emptyRentRow()],
    route: "",
    purchasePrice: "",
    dealTerms: "",
    otherNotes: "",
    attachments: [],
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

// 地積（公募／実測）を { landAreaPublic, landAreaSurveyed } に分解する。旧データは
// landArea（自由記述の1文字列。末尾に「（実測）」等が付くことが多い）のみのため、
// その場合は実測欄にそのまま入れて表示・再編集できるようにする。
export function landAreaPartsOf(property) {
  if (property?.landAreaPublic !== undefined || property?.landAreaSurveyed !== undefined) {
    return {
      landAreaPublic: property.landAreaPublic || "",
      landAreaSurveyed: property.landAreaSurveyed || "",
    };
  }
  return { landAreaPublic: "", landAreaSurveyed: property?.landArea || "" };
}

// 前面道路を { north, east, south, west } に分解する。旧データは road（自由記述の
// 1文字列）のみのため、その場合は北側欄にそのまま入れて表示・再編集できるように
// する。
export function roadPartsOf(property) {
  if (property?.roads && typeof property.roads === "object") {
    return {
      north: property.roads.north || "",
      east: property.roads.east || "",
      south: property.roads.south || "",
      west: property.roads.west || "",
    };
  }
  if (property?.road) {
    return { north: property.road, east: "", south: "", west: "" };
  }
  return { north: "", east: "", south: "", west: "" };
}

// 建蔽率／容積率を { buildingCoverage, floorAreaRatio } に分解する。旧データは
// buildingCoverage に「80％／300％」のようにまとめて保存していたため、
// floorAreaRatio が未設定ならスラッシュで分割して復元する。
export function coverageRatioPartsOf(property) {
  if (property?.floorAreaRatio) {
    return {
      buildingCoverage: property?.buildingCoverage || "",
      floorAreaRatio: property.floorAreaRatio,
    };
  }
  const combined = property?.buildingCoverage || "";
  const parts = combined.split(/[／/]/);
  if (parts.length >= 2) {
    return { buildingCoverage: parts[0].trim(), floorAreaRatio: parts.slice(1).join("/").trim() };
  }
  return { buildingCoverage: combined, floorAreaRatio: "" };
}

export function emptyBuilding() {
  return {
    houseNumber: "",
    structure: "",
    buildingUse: "",
    totalFloorArea: "",
    builtDate: "",
    permitNumbers: "",
    floors: [{ name: "1F", area: "" }],
  };
}

// 建物概要の配列を返す。新データは buildings（配列）で複数棟を保持するが、旧データは
// houseNumber/structure/...・floors を物件データ直下にフラットな1棟分として持って
// いたため、その場合は1棟分の配列に包んで表示・再編集できるようにする。
export function buildingsOf(property) {
  if (Array.isArray(property?.buildings) && property.buildings.length > 0) {
    return property.buildings.map((b) => ({
      houseNumber: b.houseNumber || "",
      structure: b.structure || "",
      buildingUse: b.buildingUse || "",
      totalFloorArea: b.totalFloorArea || "",
      builtDate: b.builtDate || "",
      permitNumbers: b.permitNumbers || "",
      floors: Array.isArray(b.floors) && b.floors.length > 0 ? b.floors : [{ name: "", area: "" }],
    }));
  }
  const hasLegacyBuilding =
    property?.houseNumber ||
    property?.structure ||
    property?.buildingUse ||
    property?.totalFloorArea ||
    property?.builtDate ||
    property?.permitNumbers ||
    (Array.isArray(property?.floors) && property.floors.length > 0);
  if (hasLegacyBuilding) {
    return [
      {
        houseNumber: property?.houseNumber || "",
        structure: property?.structure || "",
        buildingUse: property?.buildingUse || "",
        totalFloorArea: property?.totalFloorArea || "",
        builtDate: property?.builtDate || "",
        permitNumbers: property?.permitNumbers || "",
        floors:
          Array.isArray(property?.floors) && property.floors.length > 0
            ? property.floors
            : [{ name: "1F", area: "" }],
      },
    ];
  }
  return [emptyBuilding()];
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
