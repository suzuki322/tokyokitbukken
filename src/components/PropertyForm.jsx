import { useState } from "react";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import {
  accessPartsOf,
  buildingsOf,
  coverageRatioPartsOf,
  emptyBuilding,
  emptyRentRow,
  landAreaPartsOf,
  landNumbersOf,
  ROAD_DIRECTIONS,
  roadPartsOf,
} from "../model";
import StationInput from "./StationInput";

// 不動産登記規則上の地目区分（全23種）。実務でよく使うものを先頭に配置。
const LAND_USE_OPTIONS = [
  "宅地",
  "田",
  "畑",
  "山林",
  "原野",
  "雑種地",
  "公衆用道路",
  "学校用地",
  "鉄道用地",
  "水道用地",
  "用悪水路",
  "ため池",
  "堤",
  "井溝",
  "保安林",
  "公園",
  "牧場",
  "池沼",
  "墓地",
  "境内地",
  "運河用地",
  "塩田",
  "鉱泉地",
];

// 都市計画法上の用途地域（全13種）。
const ZONING_OPTIONS = [
  "第一種低層住居専用地域",
  "第二種低層住居専用地域",
  "田園住居地域",
  "第一種中高層住居専用地域",
  "第二種中高層住居専用地域",
  "第一種住居地域",
  "第二種住居地域",
  "準住居地域",
  "近隣商業地域",
  "商業地域",
  "準工業地域",
  "工業地域",
  "工業専用地域",
];

// 建築基準法上の防火指定区分。
const FIRE_PROTECTION_OPTIONS = ["防火地域", "準防火地域", "22条区域", "指定なし"];

function Field({ label, children }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

export default function PropertyForm({ initial, saving, error, onSave, onCancel }) {
  const [data, setData] = useState(() => ({
    ...initial,
    landNumbers: landNumbersOf(initial),
    ...accessPartsOf(initial),
    ...landAreaPartsOf(initial),
    roads: roadPartsOf(initial),
    ...coverageRatioPartsOf(initial),
    buildings: buildingsOf(initial),
  }));

  const set = (key) => (e) => setData({ ...data, [key]: e.target.value });

  const setRoad = (key) => (e) =>
    setData({ ...data, roads: { ...data.roads, [key]: e.target.value } });

  const setLandNumber = (idx) => (e) => {
    const landNumbers = [...data.landNumbers];
    landNumbers[idx] = e.target.value;
    setData({ ...data, landNumbers });
  };
  const addLandNumber = () => setData({ ...data, landNumbers: [...data.landNumbers, ""] });
  const removeLandNumber = (idx) =>
    setData({ ...data, landNumbers: data.landNumbers.filter((_, i) => i !== idx) });

  const setBuilding = (bIdx, key) => (e) => {
    const buildings = [...data.buildings];
    buildings[bIdx] = { ...buildings[bIdx], [key]: e.target.value };
    setData({ ...data, buildings });
  };
  const addBuilding = () => setData({ ...data, buildings: [...data.buildings, emptyBuilding()] });
  const removeBuilding = (bIdx) =>
    setData({ ...data, buildings: data.buildings.filter((_, i) => i !== bIdx) });

  const setFloor = (bIdx, fIdx, key) => (e) => {
    const buildings = [...data.buildings];
    const floors = [...buildings[bIdx].floors];
    floors[fIdx] = { ...floors[fIdx], [key]: e.target.value };
    buildings[bIdx] = { ...buildings[bIdx], floors };
    setData({ ...data, buildings });
  };
  const addFloor = (bIdx) => {
    const buildings = [...data.buildings];
    buildings[bIdx] = { ...buildings[bIdx], floors: [...buildings[bIdx].floors, { name: "", area: "" }] };
    setData({ ...data, buildings });
  };
  const removeFloor = (bIdx, fIdx) => {
    const buildings = [...data.buildings];
    buildings[bIdx] = { ...buildings[bIdx], floors: buildings[bIdx].floors.filter((_, i) => i !== fIdx) };
    setData({ ...data, buildings });
  };

  const setRent = (idx, key) => (e) => {
    const rentRoll = [...data.rentRoll];
    rentRoll[idx] = { ...rentRoll[idx], [key]: e.target.value };
    setData({ ...data, rentRoll });
  };
  const addRent = () => setData({ ...data, rentRoll: [...data.rentRoll, emptyRentRow()] });
  const removeRent = (idx) =>
    setData({ ...data, rentRoll: data.rentRoll.filter((_, i) => i !== idx) });

  const submit = (e) => {
    e.preventDefault();
    const landNumbers = data.landNumbers.map((s) => s.trim()).filter(Boolean);
    const access = [data.stationText, data.walkText]
      .map((s) => (s || "").trim())
      .filter(Boolean)
      .join(" ");
    onSave({
      ...data,
      landNumbers: landNumbers.length > 0 ? landNumbers : [""],
      access,
    });
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="banner error">{error}</div>}

      <div className="form-section">
        <h2>１．物件基本情報</h2>
        <div className="form-grid">
          <Field label="物件名">
            <input value={data.name} onChange={set("name")} required />
          </Field>
          <Field label="物件種別">
            <select value={data.propertyType} onChange={set("propertyType")}>
              <option value="新築ビル">新築ビル</option>
              <option value="中古ビル">中古ビル</option>
              <option value="戸建て">戸建て</option>
              <option value="区分マンション">区分マンション</option>
              <option value="新築マンション">新築マンション</option>
              <option value="中古マンション">中古マンション</option>
              <option value="土地">土地</option>
            </select>
          </Field>
          <Field label="所在（地番）">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.landNumbers.map((ln, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input
                    value={ln}
                    onChange={setLandNumber(i)}
                    placeholder="例：3066番17"
                    style={{ flex: 1 }}
                  />
                  {data.landNumbers.length > 1 && (
                    <button type="button" className="btn danger" onClick={() => removeLandNumber(i)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn secondary"
                style={{ alignSelf: "flex-start" }}
                onClick={addLandNumber}
              >
                <Plus size={14} /> 地番を追加
              </button>
            </div>
          </Field>
          <Field label="住居表示">
            <input value={data.residentialAddress} onChange={set("residentialAddress")} />
          </Field>
          <Field label="交通">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <StationInput
                value={data.stationText}
                onChange={(v) => setData({ ...data, stationText: v })}
                placeholder="駅名で検索（例：緑が丘）"
              />
              <input
                value={data.walkText}
                onChange={set("walkText")}
                placeholder="例：徒歩約1分"
              />
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                駅データ提供：
                <a href="https://express.heartrails.com/" target="_blank" rel="noreferrer">
                  HeartRails Express
                </a>
              </div>
            </div>
          </Field>
          <Field label="地目／土地権利">
            <div style={{ display: "flex", gap: 6 }}>
              <select value={data.landUse} onChange={set("landUse")} style={{ flex: 1 }}>
                {!LAND_USE_OPTIONS.includes(data.landUse) && data.landUse && (
                  <option value={data.landUse}>{data.landUse}</option>
                )}
                {LAND_USE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <input
                value={data.landRight}
                onChange={set("landRight")}
                placeholder="土地権利（例：所有権）"
                style={{ flex: 1 }}
              />
            </div>
          </Field>
          <Field label="地積（公募）">
            <input
              value={data.landAreaPublic}
              onChange={set("landAreaPublic")}
              placeholder="例：134.11㎡（40.57坪）"
            />
          </Field>
          <Field label="地積（実測）">
            <input
              value={data.landAreaSurveyed}
              onChange={set("landAreaSurveyed")}
              placeholder="例：135.20㎡（40.90坪）"
            />
          </Field>
          {ROAD_DIRECTIONS.map(({ key, label }) => (
            <Field key={key} label={`道路（${label}）`}>
              <input value={data.roads[key]} onChange={setRoad(key)} placeholder="例：公道 幅員6.0m" />
            </Field>
          ))}
          <Field label="用途地域">
            <select value={data.zoning} onChange={set("zoning")}>
              <option value="">未選択</option>
              {!ZONING_OPTIONS.includes(data.zoning) && data.zoning && (
                <option value={data.zoning}>{data.zoning}</option>
              )}
              {ZONING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="建蔽率">
            <input value={data.buildingCoverage} onChange={set("buildingCoverage")} placeholder="例：80％" />
          </Field>
          <Field label="容積率">
            <input value={data.floorAreaRatio} onChange={set("floorAreaRatio")} placeholder="例：300％" />
          </Field>
          <Field label="防火指定">
            <select value={data.fireProtection} onChange={set("fireProtection")}>
              <option value="">未選択</option>
              {!FIRE_PROTECTION_OPTIONS.includes(data.fireProtection) && data.fireProtection && (
                <option value={data.fireProtection}>{data.fireProtection}</option>
              )}
              {FIRE_PROTECTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="form-section">
        <h2>２．建物概要</h2>
        {data.buildings.map((b, bIdx) => (
          <div
            key={bIdx}
            style={{
              borderBottom: bIdx < data.buildings.length - 1 ? "2px solid var(--border)" : "none",
            }}
          >
            {data.buildings.length > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px 0",
                }}
              >
                <div style={{ fontWeight: "bold", color: "var(--navy)", fontSize: 13 }}>
                  建物{bIdx + 1}
                </div>
                <button type="button" className="btn danger" onClick={() => removeBuilding(bIdx)}>
                  <Trash2 size={14} /> この建物を削除
                </button>
              </div>
            )}
            <div className="form-grid">
              <Field label="家屋番号">
                <input value={b.houseNumber} onChange={setBuilding(bIdx, "houseNumber")} />
              </Field>
              <Field label="構造">
                <input value={b.structure} onChange={setBuilding(bIdx, "structure")} />
              </Field>
              <Field label="用途">
                <input value={b.buildingUse} onChange={setBuilding(bIdx, "buildingUse")} />
              </Field>
              <Field label="延床面積">
                <input value={b.totalFloorArea} onChange={setBuilding(bIdx, "totalFloorArea")} />
              </Field>
              <Field label="築年月">
                <input value={b.builtDate} onChange={setBuilding(bIdx, "builtDate")} />
              </Field>
              <Field label="建築確認／検査済証">
                <input value={b.permitNumbers} onChange={setBuilding(bIdx, "permitNumbers")} />
              </Field>
            </div>
            <div style={{ padding: "0 14px 14px" }}>
              <table className="rentroll-table">
                <thead>
                  <tr><th style={{ width: "40%" }}>階</th><th>面積</th><th style={{ width: 40 }}></th></tr>
                </thead>
                <tbody>
                  {b.floors.map((f, fIdx) => (
                    <tr key={fIdx}>
                      <td><input value={f.name} onChange={setFloor(bIdx, fIdx, "name")} placeholder="1F" /></td>
                      <td><input value={f.area} onChange={setFloor(bIdx, fIdx, "area")} placeholder="90.98㎡" /></td>
                      <td>
                        <button type="button" className="btn danger" onClick={() => removeFloor(bIdx, fIdx)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="btn secondary"
                style={{ marginTop: 8 }}
                onClick={() => addFloor(bIdx)}
              >
                <Plus size={14} /> 階を追加
              </button>
            </div>
          </div>
        ))}
        <div style={{ padding: 14 }}>
          <button type="button" className="btn secondary" onClick={addBuilding}>
            <Plus size={14} /> 建物を追加
          </button>
        </div>
      </div>

      <div className="form-section">
        <h2>３．価格・収益</h2>
        <div className="form-grid">
          <Field label="価格">
            <input value={data.price} onChange={set("price")} placeholder="例：金565,000,000円（税込）" />
          </Field>
          <Field label="現況">
            <input value={data.status} onChange={set("status")} />
          </Field>
          <Field label="引渡">
            <input value={data.handover} onChange={set("handover")} />
          </Field>
        </div>
        <div className="form-grid wide">
          <Field label="備考">
            <textarea value={data.notes} onChange={set("notes")} />
          </Field>
        </div>
      </div>

      <div className="form-section">
        <h2>４．想定レントロール</h2>
        <div style={{ padding: 14, overflowX: "auto" }}>
          <table className="rentroll-table">
            <thead>
              <tr>
                <th>部屋No</th><th>用途</th><th>契約面積(㎡)</th><th>契約面積(坪)</th>
                <th>賃料(税抜)</th><th>共益費(税抜)</th><th>保証金</th><th>現況/備考</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.rentRoll.map((r, i) => (
                <tr key={i}>
                  <td><input value={r.room} onChange={setRent(i, "room")} /></td>
                  <td><input value={r.use} onChange={setRent(i, "use")} /></td>
                  <td><input value={r.areaM2} onChange={setRent(i, "areaM2")} /></td>
                  <td><input value={r.areaTsubo} onChange={setRent(i, "areaTsubo")} /></td>
                  <td><input value={r.rent} onChange={setRent(i, "rent")} /></td>
                  <td><input value={r.cam} onChange={setRent(i, "cam")} /></td>
                  <td><input value={r.deposit} onChange={setRent(i, "deposit")} /></td>
                  <td><input value={r.status} onChange={setRent(i, "status")} /></td>
                  <td>
                    <button type="button" className="btn danger" onClick={() => removeRent(i)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={addRent}>
            <Plus size={14} /> 区画を追加
          </button>
        </div>
        <div className="form-grid wide" style={{ paddingTop: 0 }}>
          <Field label="出所（任意）">
            <input value={data.source} onChange={set("source")} placeholder="例：物件概要資料一式、登記事項証明書" />
          </Field>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn" disabled={saving}>
          <Save size={16} /> {saving ? "保存中..." : "保存する"}
        </button>
        <button type="button" className="btn secondary" onClick={onCancel}>
          <ArrowLeft size={16} /> 一覧に戻る
        </button>
      </div>
    </form>
  );
}
