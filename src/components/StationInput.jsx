import { useEffect, useRef, useState } from "react";

// 駅名から路線・都道府県候補をサジェストする入力欄。
// データは HeartRails Express（無料・APIキー不要、要クレジット表記）を利用。
// https://express.heartrails.com/
const API_BASE = "https://express.heartrails.com/api/json";

export default function StationInput({ value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const blurRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurRef.current) clearTimeout(blurRef.current);
    };
  }, []);

  const search = (query) => {
    const id = ++requestIdRef.current;
    setLoading(true);
    fetch(`${API_BASE}?method=getStations&name=${encodeURIComponent(query)}`)
      .then((res) => (res.ok ? res.json() : { response: {} }))
      .then((json) => {
        if (id !== requestIdRef.current) return; // 古いリクエストは無視
        const stations = json?.response?.station || [];
        setSuggestions(stations.slice(0, 10));
        setOpen(stations.length > 0);
      })
      .catch(() => {
        if (id !== requestIdRef.current) return;
        setSuggestions([]);
        setOpen(false);
      })
      .finally(() => {
        if (id !== requestIdRef.current) return;
        setLoading(false);
      });
  };

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = v.trim();
    if (!query) {
      requestIdRef.current++; // 進行中のリクエストを無効化
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 350);
  };

  const pick = (st) => {
    onChange(`${st.line}「${st.name}」駅`);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => {
          // サジェスト項目のクリック（mousedown）が先に処理されるよう少し待つ
          blurRef.current = setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div className="station-suggest">
          {loading && <div className="station-suggest-item muted">検索中…</div>}
          {!loading && suggestions.length === 0 && (
            <div className="station-suggest-item muted">候補が見つかりません</div>
          )}
          {!loading &&
            suggestions.map((st, i) => (
              <div
                key={`${st.name}-${st.line}-${i}`}
                className="station-suggest-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(st);
                }}
              >
                <span className="station-name">{st.name}駅</span>
                <span className="station-line">
                  {st.line}（{st.prefecture}）
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
