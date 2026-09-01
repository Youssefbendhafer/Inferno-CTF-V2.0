<?php
// Unused — routing is handled by mod_rewrite → relic.php
http_response_code(404);
echo json_encode(['error' => 'Not found']);
