import { useMemo } from "react";
import { landNumbersOf, parseMapCoords } from "../model";

// 案内図（Googleマップ埋め込み）。
// 住居表示（なければ地番）をそのままGoogleマップの検索クエリにして表示する。
// 「地図の座標」が入力されていれば、住所より座標を優先する。
// APIキーは不要（埋め込み用のURLを使う）。

export function mapQueryOf(property) {
  const manual = parseMapCoords(property?.mapCoords);
  if (manual) return `${manual.lat},${manual.lng}`;
  const address = String(property?.residentialAddress || "").trim();
  if (address) return address;
  const landNumber = landNumbersOf(property).find((s) => String(s || "").trim());
  return landNumber ? String(landNumber).trim() : "";
}

export default function LocationMap({ property, number }) {
  const query = useMemo(() => mapQueryOf(property), [property]);

  // 住所も座標もなければ何も出さない
  if (!query) return null;

  const encoded = encodeURIComponent(query);
  const embedUrl = `https://maps.google.com/maps?q=${encoded}&hl=ja&z=17&output=embed`;
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  return (
    <div className="sheet-section sheet-map">
      <h3>{number}．案内図</h3>
      <div style={{ padding: 12 }}>
        <div className="map-frame">
          <iframe
            title="案内図"
            src={embedUrl}
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div className="map-links no-print">
          <span>検索：{query}</span>
          <a href={openUrl} target="_blank" rel="noreferrer">
            Googleマップで開く
          </a>
        </div>
      </div>
    </div>
  );
}
