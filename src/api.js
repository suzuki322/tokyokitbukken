// API クライアント — server/api.php とやり取りする薄いラッパー
const API_BASE = import.meta.env.VITE_API_BASE || "/api.php";
const API_TOKEN = import.meta.env.VITE_API_TOKEN || "";

async function request(params, options = {}) {
  const url = new URL(API_BASE, window.location.href);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Token": API_TOKEN,
      ...(options.headers || {}),
    },
  });

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    // ignore — 空レスポンス等
  }

  if (!res.ok) {
    const err = new Error(body?.error || `リクエストに失敗しました (HTTP ${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export function listProperties() {
  return request({ action: "list" });
}

export function getProperty(id) {
  return request({ action: "get", id });
}

export function createProperty(data) {
  return request({ action: "create" }, { method: "POST", body: JSON.stringify(data) });
}

export function updateProperty(id, data, expectedVersion) {
  return request(
    { action: "update", id },
    { method: "POST", body: JSON.stringify({ ...data, expectedVersion }) }
  );
}

export function deleteProperty(id, expectedVersion) {
  return request(
    { action: "delete", id },
    { method: "POST", body: JSON.stringify({ expectedVersion }) }
  );
}

export async function uploadAttachment(id, file) {
  const url = new URL(API_BASE, window.location.href);
  url.searchParams.set("action", "uploadAttachment");
  url.searchParams.set("id", id);

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "X-Api-Token": API_TOKEN },
    body: formData,
  });

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    // ignore — 空レスポンス等
  }

  if (!res.ok) {
    const err = new Error(body?.error || `アップロードに失敗しました (HTTP ${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export function deleteAttachment(id, attachmentId) {
  return request(
    { action: "deleteAttachment", id, attachmentId },
    { method: "POST", body: JSON.stringify({}) }
  );
}

export function attachmentUrl(id, attachmentId) {
  const url = new URL(API_BASE, window.location.href);
  url.searchParams.set("action", "downloadAttachment");
  url.searchParams.set("id", id);
  url.searchParams.set("attachmentId", attachmentId);
  url.searchParams.set("token", API_TOKEN);
  return url.toString();
}
