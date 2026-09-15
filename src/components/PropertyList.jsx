import { Plus, Pencil, Eye, Trash2 } from "lucide-react";

export default function PropertyList({ properties, loading, onNew, onOpen, onEdit, onDelete }) {
  if (loading) return <p>読み込み中...</p>;

  if (!properties.length) {
    return (
      <div className="empty-state">
        <p>まだ物件が登録されていません。</p>
        <button className="btn" onClick={onNew}>
          <Plus size={16} /> 新規物件を作成
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="form-actions" style={{ marginBottom: 12 }}>
        <button className="btn" onClick={onNew}>
          <Plus size={16} /> 新規物件を作成
        </button>
      </div>
      <table className="list-table">
        <thead>
          <tr>
            <th>物件名</th>
            <th>所在</th>
            <th>価格</th>
            <th>現況</th>
            <th>更新日</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((p) => (
            <tr key={p.id}>
              <td>{p.name || "(無題)"}</td>
              <td>{p.landNumber || p.residentialAddress || "-"}</td>
              <td>{p.price || "-"}</td>
              <td>{p.status || "-"}</td>
              <td>{p.updatedAt ? new Date(p.updatedAt).toLocaleString("ja-JP") : "-"}</td>
              <td className="row-actions">
                <button className="btn secondary" onClick={() => onOpen(p.id)}>
                  <Eye size={14} /> 表示
                </button>
                <button className="btn secondary" onClick={() => onEdit(p.id)}>
                  <Pencil size={14} /> 編集
                </button>
                <button className="btn danger" onClick={() => onDelete(p)}>
                  <Trash2 size={14} /> 削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
