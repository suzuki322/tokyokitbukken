import { useEffect, useMemo, useState } from "react";
import { landNumbersOf, parseMapCoords } from "../model";

// 案内図（国土地理院タイル）。
// 住居表示（なければ地番）を国土地理院の住所検索API（無料・キー不要）で緯度経度に
// 変換し、標準地図タイルを並べて静止画として表示する。
// Leaflet等を使わず <img> を並べるだけにしているのは、印刷／PDF保存時に画面幅と
// 印刷幅が違っても位置がずれないようにするため（すべて割合指定で配置）。

const ZOOM = 17;
const TILE = 256;
// 表示範囲（タイル座標系のピクセル）。縦横比 8:3。
const VIEW_W = 1024;
const VIEW_H = 384;
const TILE_URL = (z, x, y) => `https://cyberjapandata.gsi.go.jp/xyz/std/${z}/${x}/${y}.png`;
const SEARCH_URL = "https://msearch.gsi.go.jp/address-search/AddressSearch?q=";

const geocodeCache = new Map();

async function geocode(query) {
  if (geocodeCache.has(query)) return geocodeCache.get(query);
  const res = await fetch(SEARCH_URL + encodeURIComponent(query));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const list = await res.json();
  const hit = Array.isArray(list) && list.length > 0 ? list[0] : null;
  const result = hit
    ? { lng: hit.geometry.coordinates[0], lat: hit.geometry.coordinates[1], title: hit.properties?.title || query }
    : null;
  geocodeCache.set(query, result);
  return result;
}

function toTilePoint(lat, lng) {
  const n = 2 ** ZOOM;
  const rad = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * n * TILE;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * TILE;
  return { x, y };
}

export function mapQueriesOf(property) {
  const list = [];
  const address = String(property?.residentialAddress || "").trim();
  if (address) list.push(address);
  const landNumber = landNumbersOf(property).find((s) => String(s || "").trim());
  if (landNumber) list.push(String(landNumber).trim());
  return list;
}

// 国土地理院のタイルは並列取得時にまれに失敗するため、失敗したら数回やり直す。
// 読み込みに成功（または最終的に失敗）したときに onDone を1回だけ呼ぶ。
function MapTile({ src, style, onDone }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <img
      src={attempt === 0 ? src : `${src}?retry=${attempt}`}
      alt=""
      style={style}
      className="map-tile"
      draggable={false}
      onLoad={onDone}
      onError={() => {
        if (attempt >= 3) onDone();
        else setTimeout(() => setAttempt(attempt + 1), 500 * (attempt + 1));
      }}
    />
  );
}

// onStatus: "loading" | "ready" | "none"（地図なし）| "error" を親に通知する
export default function LocationMap({ property, number, onStatus }) {
  const manual = useMemo(() => parseMapCoords(property?.mapCoords), [property?.mapCoords]);
  const queries = useMemo(() => mapQueriesOf(property), [property]);
  const queryKey = queries.join("|");
  const [geo, setGeo] = useState(null); // { lat, lng, title }
  const [phase, setPhase] = useState("loading"); // loading | found | notfound | error
  const [loadedTiles, setLoadedTiles] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (manual) {
      setGeo({ ...manual, title: "座標を直接指定" });
      setPhase("found");
      return undefined;
    }
    if (queries.length === 0) {
      setPhase("notfound");
      return undefined;
    }
    setPhase("loading");
    (async () => {
      try {
        for (const q of queries) {
          const hit = await geocode(q);
          if (cancelled) return;
          if (hit) {
            setGeo(hit);
            setPhase("found");
            return;
          }
        }
        if (!cancelled) setPhase("notfound");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // queryKey が変わったときだけ再検索する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, manual?.lat, manual?.lng]);

  const tiles = useMemo(() => {
    if (!geo) return [];
    const p = toTilePoint(geo.lat, geo.lng);
    const left = p.x - VIEW_W / 2;
    const top = p.y - VIEW_H / 2;
    const out = [];
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + VIEW_H - 1) / TILE); ty++) {
      for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + VIEW_W - 1) / TILE); tx++) {
        out.push({
          key: `${tx}/${ty}`,
          src: TILE_URL(ZOOM, tx, ty),
          style: {
            left: `${((tx * TILE - left) / VIEW_W) * 100}%`,
            top: `${((ty * TILE - top) / VIEW_H) * 100}%`,
            width: `${(TILE / VIEW_W) * 100}%`,
            height: `${(TILE / VIEW_H) * 100}%`,
          },
        });
      }
    }
    return out;
  }, [geo]);

  // 位置が変わったら読み込み済みタイル数をリセット
  useEffect(() => {
    setLoadedTiles(0);
  }, [geo?.lat, geo?.lng]);

  const allLoaded = phase === "found" && tiles.length > 0 && loadedTiles >= tiles.length;

  useEffect(() => {
    if (!onStatus) return;
    if (phase === "loading") onStatus("loading");
    else if (phase === "found") onStatus(allLoaded ? "ready" : "loading");
    else onStatus(phase === "error" ? "error" : "none");
  }, [phase, allLoaded, onStatus]);

  // 住所も座標もなければ何も出さない
  if (!manual && queries.length === 0) return null;

  const markLoaded = () => setLoadedTiles((n) => n + 1);
  const hidePrint = phase !== "found" ? " no-print" : "";

  return (
    <div className={`sheet-section sheet-map${hidePrint}`}>
      <h3>{number}．案内図</h3>
      <div style={{ padding: 12 }}>
        {phase === "loading" && <div className="map-note">地図を読み込み中…</div>}
        {phase === "notfound" && (
          <div className="map-note">住所から位置を特定できませんでした。編集画面の「地図の座標」に緯度経度を入力してください。</div>
        )}
        {phase === "error" && (
          <div className="map-note">地図の位置情報を取得できませんでした（通信エラー）。再読み込みしてください。</div>
        )}
        {phase === "found" && geo && (
          <>
            <div className="map-frame">
              {tiles.map((t) => (
                <MapTile key={`${geo.lat}_${geo.lng}_${t.key}`} src={t.src} style={t.style} onDone={markLoaded} />
              ))}
              <div className="map-pin" />
            </div>
            <div className="map-credit">
              出典：国土地理院（地理院タイル）{manual ? "" : "／位置は住所から自動算出した目安です"}
            </div>
            <div className="map-links no-print">
              <span>検索結果：{geo.title}</span>
              <a
                href={`https://maps.gsi.go.jp/#17/${geo.lat.toFixed(6)}/${geo.lng.toFixed(6)}/`}
                target="_blank"
                rel="noreferrer"
              >
                地理院地図で開く
              </a>
              <a
                href={`https://www.google.com/maps?q=${geo.lat.toFixed(6)},${geo.lng.toFixed(6)}`}
                target="_blank"
                rel="noreferrer"
              >
                Googleマップで開く
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
