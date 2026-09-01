<?php

// ── Dante's Codex — Relic Service ────────────────────────────────────────────
// Served at /api/v1/relic.php via Apache mod_rewrite.
// Routes (REQUEST_URI is the original un-rewritten URI):
//   POST /api/v1/relic/upload          → upload a relic image
//   GET  /api/v1/relic/read/<file>     → serve file with its real mime type
//   GET  /api/v1/relic/json/<file>     → serve file as JSON (strips GIF prefix)

$uploadDir = '/relics/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

$uri    = strtok($_SERVER['REQUEST_URI'] ?? '', '?'); // strip query string
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Extract the sub-path after /api/v1/relic/
$base = '/api/v1/relic/';
$pos  = strpos($uri, $base);
if ($pos === false) {
    respond(400, ['error' => 'Bad route']);
}
$rest   = substr($uri, $pos + strlen($base));
$parts  = explode('/', ltrim($rest, '/'), 2);
$action = $parts[0] ?? '';


// ── UPLOAD ────────────────────────────────────────────────────────────────────
if ($action === 'upload' && $method === 'POST') {
    if (!isset($_FILES['relic']) || $_FILES['relic']['error'] !== UPLOAD_ERR_OK) {
        respond(400, ['error' => 'No relic uploaded or upload error']);
    }

    $originalName = $_FILES['relic']['name'];
    $tmpPath      = $_FILES['relic']['tmp_name'];

    // Extension check
    $ext     = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowed = ['png', 'jpg', 'jpeg', 'gif'];
    if (!in_array($ext, $allowed)) {
        respond(400, ['error' => 'Invalid extension. Only PNG, JPG, GIF relics are accepted.']);
    }

    // Magic byte check — manual, intentionally NOT using libmagic
    $fh    = fopen($tmpPath, 'rb');
    $magic = fread($fh, 8);
    fclose($fh);

    $valid = false;
    if (substr($magic, 0, 4) === "\x89PNG")                                     $valid = true;
    if (substr($magic, 0, 3) === "\xff\xd8\xff")                                $valid = true;
    if (substr($magic, 0, 6) === 'GIF87a' || substr($magic, 0, 6) === 'GIF89a') $valid = true;

    if (!$valid) {
        respond(400, ['error' => 'Invalid file magic. The relic is not a true image.']);
    }

    // Save with UUID filename
    $uuid     = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
    $filename = $uuid . '.' . $ext;
    $destPath = $uploadDir . $filename;

    if (move_uploaded_file($tmpPath, $destPath)) {
        respond(200, ['success' => true, 'id' => $uuid, 'filename' => $filename]);
    } else {
        respond(500, ['error' => 'Failed to store relic']);
    }
}


// ── READ (binary) ─────────────────────────────────────────────────────────────
if ($action === 'read' && $method === 'GET') {
    $filename = basename($parts[1] ?? '');
    serveFile($filename, false);
}


// ── JSON gadget ───────────────────────────────────────────────────────────────
// The CSPT proxy appends .json to every path, so an uploaded uuid.gif arrives
// here as uuid.gif.json — strip that trailing .json to get the real filename.
if ($action === 'json' && $method === 'GET') {
    $rawFilename = basename($parts[1] ?? '');
    $filename    = preg_replace('/\.json$/', '', $rawFilename);
    serveFile($filename, true);
}


respond(400, ['error' => 'Invalid route or method']);


// ── Helpers ───────────────────────────────────────────────────────────────────
function serveFile(string $filename, bool $asJson): void {
    global $uploadDir;

    if (empty($filename)) respond(400, ['error' => 'Missing filename']);

    // Protect the forbidden tome
    if ($filename === 'forbidden-tome.txt') {
        $expected = getenv('FLAG');
        if (empty($expected) || !isset($_COOKIE['FLAG']) || $_COOKIE['FLAG'] !== $expected) {
            respond(403, ['error' => 'Forbidden — only the Condemned may read the Tome.']);
        }
        respond(200, [
            'success' => true,
            'content' => file_get_contents($uploadDir . 'forbidden-tome.txt'),
            'flag'    => $expected,
        ]);
    }

    $filePath = $uploadDir . $filename;
    if (!file_exists($filePath)) {
        respond(404, ['error' => 'Relic not found in the archive']);
    }

    if ($asJson) {
        $raw       = file_get_contents($filePath);
        $jsonStart = strpos($raw, '{');
        if ($jsonStart === false) respond(400, ['error' => 'No JSON payload found in relic']);
        header('Content-Type: application/json');
        echo substr($raw, $jsonStart);
        exit;
    }

    $mime = mime_content_type($filePath) ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    readfile($filePath);
    exit;
}

function respond(int $code, array $body): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($body);
    exit;
}
