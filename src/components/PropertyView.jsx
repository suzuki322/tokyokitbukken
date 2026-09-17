import { ArrowLeft, Pencil, Printer } from "lucide-react";
import {
  buildingsOf,
  coverageRatioPartsOf,
  landAreaPartsOf,
  landNumbersOf,
  rentRollTotals,
  ROAD_DIRECTIONS,
  roadPartsOf,
  surfaceYield,
  toNumber,
  yen,
} from "../model";
import { attachmentUrl } from "../api";
import tokyokitLogo from "../assets/tokyokit-logo.png";

function Row({ label, value, bold, big }) {
  return (
    <div className="sheet-row">
      <div className="label">{label}</div>
      <div className="value" style={{ fontWeight: bold ? "bold" : "normal", fontSize: big ? 16 : undefined, color: big ? "var(--brand)" : undefined }}>
        {value || "-"}
      </div>
    </div>
  );
}

export default function PropertyView({ property, onBack, onEdit }) {
  const p = property;
  const totals = rentRollTotals(p.rentRoll || []);
  const y = surfaceYield(totals.annual, p.price);
  const landAreaParts = landAreaPartsOf(p);
  const roadParts = roadPartsOf(p);
  const coverageRatioParts = coverageRatioPartsOf(p);
  const roadSummary = ROAD_DIRECTIONS.map(({ key, label }) => (roadParts[key] ? `${label}：${roadParts[key]}` : null))
    .filter(Boolean)
    .join("　");
  const buildings = buildingsOf(p);

  return (
    <div>
      <div className="sheet-toolbar no-print">
        <button className="btn secondary" onClick={onBack}>
          <ArrowLeft size={16} /> 一覧に戻る
        </button>
        <button className="btn secondary" onClick={onEdit}>
          <Pencil size={16} /> 編集
        </button>
        <button className="btn" onClick={() => window.print()}>
          <Printer size={16} /> 印刷／PDF保存
        </button>
      </div>

      <div className="sheet">
        <div className="sheet-title">物件概要書　Property Outline Document</div>
        <div className="sheet-subtitle">{p.name}</div>

        <div className="sheet-section">
          <h3>１．物件基本情報</h3>
          <Row label="物件種別" value={p.propertyType} />
          <Row label="所在（地番）" value={landNumbersOf(p).filter(Boolean).join("、")} />
          <Row label="住居表示" value={p.residentialAddress} />
          <Row label="交通" value={p.access} />
          <Row label="地目／土地権利" value={`${p.landUse}／${p.landRight}`} />
          <Row label="地積（公募）" value={landAreaParts.landAreaPublic} />
          <Row label="地積（実測）" value={landAreaParts.landAreaSurveyed} />
          <Row label="道路" value={roadSummary} />
          <Row label="用途地域" value={p.zoning} />
          <Row label="建蔽率" value={coverageRatioParts.buildingCoverage} />
          <Row label="容積率" value={coverageRatioParts.floorAreaRatio} />
          <Row label="防火指定" value={p.fireProtection} />
        </div>

        <div className="sheet-section">
          <h3>２．建物概要</h3>
          {buildings.map((b, i) => (
            <div key={i}>
              {buildings.length > 1 && (
                <div
                  style={{
                    background: "var(--gray)",
                    fontWeight: "bold",
                    fontSize: 12,
                    padding: "4px 12px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  建物{i + 1}
                </div>
              )}
              <Row label="家屋番号" value={b.houseNumber} />
              <Row label="構造" value={b.structure} />
              <Row label="用途" value={b.buildingUse} />
              <Row label="延床面積" value={b.totalFloorArea} />
              <Row label="築年月" value={b.builtDate} />
              <Row label="建築確認／検査済証" value={b.permitNumbers} />
              <Row
                label="階層別面積"
                value={(b.floors || []).map((f) => `${f.name}：${f.area}`).join("　/　")}
              />
            </div>
          ))}
        </div>

        <div className="sheet-section sheet-price">
          <h3>３．価格・収益</h3>
          <Row label="価格" value={p.price} bold big />
          <Row label="年間収益" value={p.annualIncome} bold />
          <Row label="現況" value={p.status} />
          <Row label="引渡" value={p.handover} />
          <Row label="備考" value={p.notes} />
          <Row label="満室想定月額（税抜・共益費込）" value={yen(totals.total)} />
          <Row label="満室想定年額（税抜・共益費込）" value={yen(totals.annual)} bold />
          <Row
            label="表面利回り（満室想定）"
            value={y !== null ? `${y.toFixed(2)}%` : "価格未入力"}
            bold
          />
        </div>

        {p.rentRoll && p.rentRoll.length > 0 && (
          <div className="sheet-section">
            <h3>４．想定レントロール</h3>
            <div style={{ padding: 12, overflowX: "auto" }}>
              <table className="sheet-rentroll">
                <thead>
                  <tr>
                    <th>部屋No</th><th>用途</th><th>契約面積(㎡)</th><th>契約面積(坪)</th>
                    <th>賃料(税抜)</th><th>共益費(税抜)</th><th>賃料+共益費</th><th>坪単価</th>
                    <th>保証金</th><th>現況/備考</th>
                  </tr>
                </thead>
                <tbody>
                  {p.rentRoll.map((r, i) => {
                    const sum = toNumber(r.rent) + toNumber(r.cam);
                    const tsubo = toNumber(r.areaTsubo);
                    return (
                      <tr key={i}>
                        <td>{r.room}</td>
                        <td>{r.use}</td>
                        <td>{r.areaM2}㎡</td>
                        <td>{r.areaTsubo}坪</td>
                        <td>{yen(r.rent)}</td>
                        <td>{yen(r.cam)}</td>
                        <td>{yen(sum)}</td>
                        <td>{tsubo ? `@${yen(sum / tsubo)}/坪` : "-"}</td>
                        <td>{r.deposit ? yen(r.deposit) : "-"}</td>
                        <td>{r.status}</td>
                      </tr>
                    );
                  })}
                  <tr className="total">
                    <td colSpan={2}>合計</td>
                    <td>{totals.areaM2.toFixed(2)}㎡</td>
                    <td>{totals.areaTsubo.toFixed(2)}坪</td>
                    <td>{yen(totals.rent)}</td>
                    <td>{yen(totals.cam)}</td>
                    <td>{yen(totals.total)}</td>
                    <td>
                      {totals.areaTsubo ? `@${yen(totals.total / totals.areaTsubo)}/坪` : "-"}
                    </td>
                    <td>{yen(totals.deposit)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="sheet-section no-print internal-only">
          <h3>社内用メモ（印刷・PDF出力には反映されません）</h3>
          <Row label="ルート" value={p.route} />
          <Row label="仕入れ値" value={p.purchasePrice} />
          <Row label="取引条件" value={p.dealTerms} />
          <Row label="その他備考" value={p.otherNotes} />
        </div>

        {p.attachments && p.attachments.length > 0 && (
          <div className="sheet-section no-print">
            <h3>添付ファイル</h3>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {p.attachments.map((a) => (
                <a
                  key={a.id}
                  href={attachmentUrl(p.id, a.id)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13 }}
                >
                  {a.originalName}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="sheet-band">
          <div className="sheet-band-logo">
            <img src={tokyokitLogo} alt="TOKYO KIT" className="sheet-band-logo-img" />
          </div>
          <div className="sheet-band-info">
            <div className="sheet-band-company">tokyokit株式会社</div>
            <div className="sheet-band-details">
              <div>〒230-0078　神奈川県横浜市鶴見区岸谷3-6-33</div>
              <div>
                Tel　：　<span className="band-link">080-8072-2762</span>　（担当者）
              </div>
              <div>Fax　：　045-330-4295</div>
              <div>神奈川県知事（1）第32139号</div>
            </div>
          </div>
          <div className="sheet-band-table">
            <div className="sheet-band-row">
              <div className="sheet-band-label">取引形態</div>
              <div className="sheet-band-value">{p.dealType || "-"}</div>
            </div>
            <div className="sheet-band-row">
              <div className="sheet-band-label">担当者</div>
              <div className="sheet-band-value">{p.contactPerson || "-"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
