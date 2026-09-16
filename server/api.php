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

if (($_GET["action"] ?? "") === "debugpath") {
    http_response_code(200);
    echo json_encode([
        "dir" => __DIR__,
        "file" => __FILE__,
        "mtime" => date("Y-m-d H:i:s", filemtime(__FILE__)),
        "now" => date("Y-m-d H:i:s"),
        "listing" => @scandir(__DIR__),
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
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
$headers = getallheaders() ?: [];
$token = $headers["X-Api-Token"] ?? $headers["x-api-token"] ?? "";
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
            respond(200, ["ok" => true]);
        }
    }
    respond(404, ["error" => "指定の物件が見つかりません。"]);
}

respond(400, ["error" => "不明なリクエストです（action=" . $action . ", method=" . $method . "）。"]);
