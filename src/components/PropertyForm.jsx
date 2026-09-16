import { useState } from "react";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { emptyRentRow, landNumbersOf } from "../model";

function Field({ label, children }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

export default function PropertyForm({ initial, saving, error, onSave, onCancel }) {
  const [data, setData] = useState(() => ({ ...initial, landNumbers: landNumbersOf(initial) }));

  const set = (key) => (e) => setData({ ...data, [key]: e.target.value });

  const setLandNumber = (idx) => (e) => {
    const landNumbers = [...data.landNumbers];
    landNumbers[idx] = e.target.value;
    setData({ ...data, landNumbers });
  };
  const addLandNumber = () => setData({ ...data, landNumbers: [...data.landNumbers, ""] });
  const removeLandNumber = (idx) =>
    setData({ ...data, landNumbers: data.landNumbers.filter((_, i) => i !== idx) });

  const setFloor = (idx, key) => (e) => {
    const floors = [...data.floors];
    floors[idx] = { ...floors[idx], [key]: e.target.value };
    setData({ ...data, floors });
  };
  const addFloor = () => setData({ ...data, floors: [...data.floors, { name: "", area: "" }] });
  const removeFloor = (idx) =>
    setData({ ...data, floors: data.floors.filter((_, i) => i !== idx) });

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
    onSave({ ...data, landNumbers: landNumbers.length > 0 ? landNumbers : [""] });
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
            <input value={data.access} onChange={set("access")} placeholder="例：東急大井町線「緑が丘」駅 徒歩約1分" />
          </Field>
          <Field label="地目／土地権利">
            <input value={`${data.landUse}／${data.landRight}`}
              onChange={(e) => {
                const [landUse, landRight] = e.target.value.split("／");
                setData({ ...data, landUse: landUse || "", landRight: landRight || "" });
              }} />
          </Field>
          <Field label="地積">
            <input value={data.landArea} onChange={set("landArea")} placeholder="例：134.11㎡（40.57坪）" />
          </Field>
          <Field label="道路">
            <input value={data.road} onChange={set("road")} />
          </Field>
          <Field label="用途地域">
            <input value={data.zoning} onChange={set("zoning")} />
          </Field>
          <Field label="建蔽率／容積率">
            <input value={data.buildingCoverage} onChange={set("buildingCoverage")} placeholder="例：80％／300％" />
          </Field>
          <Field label="防火指定">
            <input value={data.fireProtection} onChange={set("fireProtection")} />
          </Field>
        </div>
      </div>

      <div className="form-section">
        <h2>２．建物概要</h2>
        <div className="form-grid">
          <Field label="家屋番号">
            <input value={data.houseNumber} onChange={set("houseNumber")} />
          </Field>
          <Field label="構造">
            <input value={data.structure} onChange={set("structure")} />
          </Field>
          <Field label="用途">
            <input value={data.buildingUse} onChange={set("buildingUse")} />
          </Field>
          <Field label="延床面積">
            <input value={data.totalFloorArea} onChange={set("totalFloorArea")} />
          </Field>
          <Field label="築年月">
            <input value={data.builtDate} onChange={set("builtDate")} />
          </Field>
          <Field label="建築確認／検査済証">
            <input value={data.permitNumbers} onChange={set("permitNumbers")} />
          </Field>
        </div>
        <div style={{ padding: "0 14px 14px" }}>
          <table className="rentroll-table">
            <thead>
              <tr><th style={{ width: "40%" }}>階</th><th>面積</th><th style={{ width: 40 }}></th></tr>
            </thead>
            <tbody>
              {data.floors.map((f, i) => (
                <tr key={i}>
                  <td><input value={f.name} onChange={setFloor(i, "name")} placeholder="1F" /></td>
                  <td><input value={f.area} onChange={setFloor(i, "area")} placeholder="90.98㎡" /></td>
                  <td>
                    <button type="button" className="btn danger" onClick={() => removeFloor(i)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={addFloor}>
            <Plus size={14} /> 階を追加
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
