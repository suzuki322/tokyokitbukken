import { useEffect, useState, useCallback } from "react";
import { Building2 } from "lucide-react";
import PropertyList from "./components/PropertyList";
import PropertyForm from "./components/PropertyForm";
import PropertyView from "./components/PropertyView";
import { listProperties, getProperty, createProperty, updateProperty, deleteProperty } from "./api";
import { emptyProperty } from "./model";

// view: { name: 'list' } | { name: 'new' } | { name: 'edit', id } | { name: 'view', id }

export default function App() {
  const [view, setView] = useState({ name: "list" });
  const [properties, setProperties] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [current, setCurrent] = useState(null); // フォーム/表示中のフルデータ
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await listProperties();
      setProperties(res.properties || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    setError("");
    if (view.name === "edit" || view.name === "view") {
      getProperty(view.id)
        .then((res) => setCurrent(res.property))
        .catch((e) => setError(e.message));
    } else if (view.name === "new") {
      setCurrent(emptyProperty());
    }
  }, [view]);

  const goList = () => {
    setView({ name: "list" });
    refreshList();
  };

  const handleSave = async (data) => {
    setSaving(true);
    setError("");
    try {
      if (view.name === "edit") {
        await updateProperty(view.id, data, current.version);
      } else {
        await createProperty(data);
      }
      setBanner("保存しました");
      goList();
      setTimeout(() => setBanner(""), 3000);
    } catch (e) {
      if (e.status === 409) {
        setError("他の変更と競合しました。一覧に戻って最新の内容を読み込み直してください。");
      } else if (e.status === undefined) {
        // fetch自体が失敗（通信エラー・オフライン等）した場合、
        // e.message はブラウザ既定の英語メッセージ（例："Failed to fetch"）になるため、
        // わかりやすい日本語メッセージに置き換える。
        setError("通信エラーが発生し、保存できませんでした。通信状況をご確認のうえ、もう一度お試しください。");
      } else {
        setError(e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`「${p.name || "この物件"}」を削除します。よろしいですか？`)) return;
    try {
      await deleteProperty(p.id, p.version);
      refreshList();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1>
          <Building2 size={20} style={{ verticalAlign: "-4px", marginRight: 6 }} />
          物件概要書ジェネレーター
        </h1>
      </div>

      {banner && <div className="banner success">{banner}</div>}
      {error && view.name === "list" && <div className="banner error">{error}</div>}

      {view.name === "list" && (
        <PropertyList
          properties={properties}
          loading={loadingList}
          onNew={() => setView({ name: "new" })}
          onOpen={(id) => setView({ name: "view", id })}
          onEdit={(id) => setView({ name: "edit", id })}
          onDelete={handleDelete}
        />
      )}

      {(view.name === "new" || view.name === "edit") && current && (
        <PropertyForm
          key={view.name + (view.id || "new")}
          initial={current}
          saving={saving}
          error={error}
          onSave={handleSave}
          onCancel={goList}
        />
      )}

      {view.name === "view" && current && (
        <PropertyView
          property={current}
          onBack={goList}
          onEdit={() => setView({ name: "edit", id: view.id })}
        />
      )}
    </div>
  );
}
