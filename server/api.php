<?php
/**
 * 物件概要書ジェネレーター — 簡易API
 *
 * 複数物件のCRUDを行う。データは同ディレクトリの data/properties.json に保存する。
 * 認証は共有トークン（config.php の API_TOKEN）による簡易方式。URLを知っている
 * relying party（社内・取引先）向けの限定共有を想定しており、強固な認証は行わない。
 *
 * 対応エンドポイント:
 *   GET  ?action=list                -> 物件の一覧（サマリ）
 *   GET  ?action=get&id=...          -> 物件の全項目
 *   POST ?action=create              -> 新規作成（body: 物件データ）
 *   POST ?action=update&id=...       -> 更新（body: 物件データ + expectedVersion）
 *   POST ?action=delete&id=...       -> 削除（body: expectedVersion）
 *
 * 楽観ロック: 各物件は version を持ち、update/delete 時に expectedVersion と
 * 一致しない場合は HTTP 409 を返す（先に保存した側が勝つ）。
 */

declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, X-Api-Token");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

$configPath = __DIR__ . "/config.php";
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(["error" => "config.php が見つかりません。config.example.php を参考に設置してください。"]);
    exit;
}
require $configPath;

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// --- 認証 ---
// 添付ファイルの表示・ダウンロード（<a href>・<img src> 等、リクエストヘッダを
// 付けられない箇所からアクセスする）のみ、クエリパラメータ ?token=... でも認証
// できるようにする。それ以外は従来どおり X-Api-Token ヘッダのみ。
$headers = getallheaders() ?: [];
$token = $headers["X-Api-Token"] ?? $headers["x-api-token"] ?? ($_GET["token"] ?? "");
if (!defined("API_TOKEN") || API_TOKEN === "" || !hash_equals(API_TOKEN, (string) $token)) {
    respond(401, ["error" => "認証トークンが無効です。"]);
}

$dataDir = __DIR__ . "/data";
$dataFile = $dataDir . "/properties.json";
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode(["properties" => []], JSON_PRETTY_PRINT));
}

function loadStore(string $dataFile): array {
    $raw = file_get_contents($dataFile);
    $json = json_decode($raw, true);
    if (!is_array($json) || !isset($json["properties"])) {
        return ["properties" => []];
    }
    return $json;
}

/** ファイルロックしつつ書き込み（同時書き込み対策） */
function saveStore(string $dataFile, array $store): void {
    $fp = fopen($dataFile, "c+");
    if ($fp === false) {
        respond(500, ["error" => "データファイルを開けませんでした。"]);
    }
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

function summarize(array $p): array {
    return [
        "id" => $p["id"],
        "version" => $p["version"],
        "name" => $p["name"] ?? "",
        "landNumber" => $p["landNumber"] ?? "",
        "residentialAddress" => $p["residentialAddress"] ?? "",
        "price" => $p["price"] ?? "",
        "status" => $p["status"] ?? "",
        "updatedAt" => $p["updatedAt"] ?? null,
    ];
}

$action = $_GET["action"] ?? "";
$method = $_SERVER["REQUEST_METHOD"];

$store = loadStore($dataFile);

if ($method === "GET" && $action === "list") {
    $list = array_map("summarize", $store["properties"]);
    usort($list, fn($a, $b) => strcmp($b["updatedAt"] ?? "", $a["updatedAt"] ?? ""));
    respond(200, ["properties" => $list]);
}

if ($method === "GET" && $action === "get") {
    $id = $_GET["id"] ?? "";
    foreach ($store["properties"] as $p) {
        if ($p["id"] === $id) {
            respond(200, ["property" => $p]);
        }
    }
    respond(404, ["error" => "指定の物件が見つかりません。"]);
}

if ($method === "GET" && $action === "downloadAttachment") {
    $id = $_GET["id"] ?? "";
    $attachmentId = $_GET["attachmentId"] ?? "";
    foreach ($store["properties"] as $p) {
        if ($p["id"] === $id) {
            foreach (($p["attachments"] ?? []) as $a) {
                if ($a["id"] === $attachmentId) {
                    $path = $dataDir . "/uploads/" . $id . "/" . $a["filename"];
                    if (!file_exists($path)) {
                        respond(404, ["error" => "ファイルが見つかりません。"]);
                    }
                    header("Content-Type: " . ($a["mimeType"] ?: "application/octet-stream"));
                    header(
                        "Content-Disposition: inline; filename=\"" .
                            rawurlencode($a["originalName"] ?? $a["filename"]) .
                            "\""
                    );
                    header("Content-Length: " . filesize($path));
                    readfile($path);
                    exit;
                }
            }
            respond(404, ["error" => "ファイルが見つかりません。"]);
        }
    }
    respond(404, ["error" => "指定の物件が見つかりません。"]);
}

$input = json_decode(file_get_contents("php://input"), true);
if ($method === "POST" && !is_array($input)) {
    $input = [];
}

if ($method === "POST" && $action === "create") {
    $now = date(DATE_ATOM);
    $property = $input;
    $property["id"] = bin2hex(random_bytes(8));
    $property["version"] = 1;
    $property["createdAt"] = $now;
    $property["updatedAt"] = $now;
    unset($property["expectedVersion"]);

    $store["properties"][] = $property;
    saveStore($dataFile, $store);
    respond(201, ["property" => $property]);
}

if ($method === "POST" && $action === "update") {
    $id = $_GET["id"] ?? "";
    $expectedVersion = $input["expectedVersion"] ?? null;
    unset($input["expectedVersion"], $input["id"]);

    foreach ($store["properties"] as $i => $p) {
        if ($p["id"] === $id) {
            if ($expectedVersion !== null && (int) $expectedVersion !== (int) $p["version"]) {
                respond(409, [
                    "error" => "他の変更と競合しました（バージョン不一致）。",
                    "currentVersion" => $p["version"],
                ]);
            }
            $updated = array_merge($p, $input);
            $updated["id"] = $id;
            $updated["version"] = (int) $p["version"] + 1;
            $updated["updatedAt"] = date(DATE_ATOM);
            $store["properties"][$i] = $updated;
            saveStore($dataFile, $store);
            respond(200, ["property" => $updated]);
        }
    }
    respond(404, ["error" => "指定の物件が見つかりません。"]);
}

if ($method === "POST" && $action === "delete") {
    $id = $_GET["id"] ?? "";
    $expectedVersion = $input["expectedVersion"] ?? null;

    foreach ($store["properties"] as $i => $p) {
        if ($p["id"] === $id) {
            if ($expectedVersion !== null && (int) $expectedVersion !== (int) $p["version"]) {
                respond(409, [
                    "error" => "他の変更と競合しました（バージョン不一致）。",
                    "currentVersion" => $p["version"],
                ]);
            }
            array_splice($store["properties"], $i, 1);
            saveStore($dataFile, $store);
            removeUploadDir($dataDir . "/uploads/" . $id);
            respond(200, ["ok" => true]);
        }
    }
    respond(404, ["error" => "指定の物件が見つかりません。"]);
}

// --- 添付ファイル（PDF・画像） ---
// 対応拡張子とサイズ上限（20MB）
$ATTACHMENT_ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "gif", "webp"];
$ATTACHMENT_MAX_SIZE = 20 * 1024 * 1024;

function removeUploadDir(string $dir): void {
    if (!is_dir($dir)) {
        return;
    }
    $files = scandir($dir) ?: [];
    foreach ($files as $f) {
        if ($f === "." || $f === "..") continue;
        $path = $dir . "/" . $f;
        if (is_dir($path)) {
            removeUploadDir($path);
        } else {
            @unlink($path);
        }
    }
    @rmdir($dir);
}

if ($method === "POST" && $action === "uploadAttachment") {
    $id = $_GET["id"] ?? "";

    if (!isset($_FILES["file"])) {
        respond(400, ["error" => "ファイルが見つかりません。"]);
    }
    $file = $_FILES["file"];
    if ($file["error"] !== UPLOAD_ERR_OK) {
        $msg = $file["error"] === UPLOAD_ERR_INI_SIZE || $file["error"] === UPLOAD_ERR_FORM_SIZE
            ? "ファイルサイズが大きすぎます。"
            : "アップロードに失敗しました（エラーコード：" . $file["error"] . "）。";
        respond(400, ["error" => $msg]);
    }
    if ($file["size"] > $ATTACHMENT_MAX_SIZE) {
        respond(400, ["error" => "ファイルサイズが大きすぎます（上限20MB）。"]);
    }
    $ext = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
    if (!in_array($ext, $ATTACHMENT_ALLOWED_EXT, true)) {
        respond(400, ["error" => "対応していないファイル形式です（PDF・画像のみ）。"]);
    }

    foreach ($store["properties"] as $i => $p) {
        if ($p["id"] === $id) {
            $uploadDir = $dataDir . "/uploads/" . $id;
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0775, true);
            }
            $attachmentId = bin2hex(random_bytes(8));
            $storedName = $attachmentId . "." . $ext;
            if (!move_uploaded_file($file["tmp_name"], $uploadDir . "/" . $storedName)) {
                respond(500, ["error" => "ファイルの保存に失敗しました。"]);
            }
            $mimeTypes = [
                "pdf" => "application/pdf",
                "jpg" => "image/jpeg",
                "jpeg" => "image/jpeg",
                "png" => "image/png",
                "gif" => "image/gif",
                "webp" => "image/webp",
            ];
            $attachments = $p["attachments"] ?? [];
            $attachments[] = [
                "id" => $attachmentId,
                "filename" => $storedName,
                "originalName" => $file["name"],
                "mimeType" => $mimeTypes[$ext] ?? "application/octet-stream",
                "size" => $file["size"],
                "uploadedAt" => date(DATE_ATOM),
            ];
            $p["attachments"] = $attachments;
            $p["version"] = (int) $p["version"] + 1;
            $p["updatedAt"] = date(DATE_ATOM);
            $store["properties"][$i] = $p;
            saveStore($dataFile, $store);
            respond(200, ["property" => $p]);
        }
    }
    respond(404, ["error" => "指定の物件が見つかりません。"]);
}

if ($method === "POST" && $action === "deleteAttachment") {
    $id = $_GET["id"] ?? "";
    $attachmentId = $_GET["attachmentId"] ?? "";

    foreach ($store["properties"] as $i => $p) {
        if ($p["id"] === $id) {
            $attachments = $p["attachments"] ?? [];
            $target = null;
            $remaining = [];
            foreach ($attachments as $a) {
                if ($a["id"] === $attachmentId) {
                    $target = $a;
                } else {
                    $remaining[] = $a;
                }
            }
            if ($target !== null) {
                $path = $dataDir . "/uploads/" . $id . "/" . $target["filename"];
                if (file_exists($path)) {
                    @unlink($path);
                }
            }
            $p["attachments"] = $remaining;
            $p["version"] = (int) $p["version"] + 1;
            $p["updatedAt"] = date(DATE_ATOM);
            $store["properties"][$i] = $p;
            saveStore($dataFile, $store);
            respond(200, ["property" => $p]);
        }
    }
    respond(404, ["error" => "指定の物件が見つかりません。"]);
}

respond(400, ["error" => "不明なリクエストです（action=" . $action . ", method=" . $method . "）。"]);
