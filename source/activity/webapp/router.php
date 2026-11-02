<?php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (preg_match('/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?)$/', $uri)) {
    return false;
}

$_SERVER['SCRIPT_NAME'] = '/web.html';
require __DIR__ . '/web.html';
return true;


