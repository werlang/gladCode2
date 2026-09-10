<?php
    /**
     * Database singleton. Credentials are loaded from environment variables
     * (preferred, see compose.yaml / .env) with fallback to a JSON file kept
     * OUTSIDE the web DocumentRoot. Exposes runQuery($sql, $data = null).
     * Uses PDO with strict error mode.
     *
     * Private config location (NOT web-accessible):
     *   - Docker: /var/www/private/config.json (mounted from ./config/)
     *   - Repo / production sibling: <repo>/config/config.json
     *
     * Legacy fallback public_html/config.json is still checked last so deploys
     * keep working during migration, but it triggers a deprecation warning and
     * must be removed (it is web-accessible). See config/config.json.example.
     */

    function gladcode_load_config() {
        $fileConfig = array();
        $candidates = array(
            '/var/www/private/config.json',
            __DIR__ . '/../config/config.json',
        );
        $loadedFrom = null;
        foreach ($candidates as $path) {
            if (is_readable($path)) {
                $raw = file_get_contents($path);
                $decoded = $raw !== false ? json_decode($raw, true) : null;
                if (is_array($decoded)) {
                    $fileConfig = $decoded;
                    $loadedFrom = $path;
                    break;
                }
                error_log("gladcode: invalid JSON in config at $path");
            }
        }

        // Legacy web-accessible location. Supported only for migration.
        if ($loadedFrom === null) {
            $legacy = __DIR__ . '/config.json';
            if (is_readable($legacy)) {
                $raw = file_get_contents($legacy);
                $decoded = $raw !== false ? json_decode($raw, true) : null;
                if (is_array($decoded)) {
                    $fileConfig = $decoded;
                    $loadedFrom = $legacy;
                    trigger_error(
                        'gladcode: config.json inside DocumentRoot is deprecated and web-accessible. ' .
                        'Move it to config/config.json outside the web root.',
                        E_USER_DEPRECATED
                    );
                    error_log('gladcode: loaded config from deprecated public path ' . $legacy);
                }
            }
        }

        $fileMysql = isset($fileConfig['mysql']) && is_array($fileConfig['mysql']) ? $fileConfig['mysql'] : array();
        $fileMailer = isset($fileConfig['mailer']) && is_array($fileConfig['mailer']) ? $fileConfig['mailer'] : array();

        // Environment variables take precedence over the file.
        $env = function ($name) {
            $val = getenv($name);
            return ($val === false || $val === '') ? null : $val;
        };

        $mysqlPassword = $env('MYSQL_PASSWORD');
        if ($mysqlPassword === null) {
            $mysqlPassword = $env('MYSQL_ROOT_PASSWORD');
        }

        $config = array(
            'mysql' => array(
                'host' => $env('MYSQL_HOST') ?: (isset($fileMysql['host']) ? $fileMysql['host'] : 'localhost'),
                'port' => $env('MYSQL_PORT') ?: (isset($fileMysql['port']) ? $fileMysql['port'] : 3306),
                'user' => $env('MYSQL_USER') ?: (isset($fileMysql['user']) ? $fileMysql['user'] : 'root'),
                'password' => $mysqlPassword !== null ? $mysqlPassword : (isset($fileMysql['password']) ? $fileMysql['password'] : ''),
                'database' => $env('MYSQL_DATABASE') ?: (isset($fileMysql['database']) ? $fileMysql['database'] : 'gladcode'),
            ),
            'mailer' => array(
                'host' => $env('MAILER_HOST') ?: (isset($fileMailer['host']) ? $fileMailer['host'] : 'email-smtp.us-east-1.amazonaws.com'),
                'port' => $env('MAILER_PORT') ?: (isset($fileMailer['port']) ? $fileMailer['port'] : 587),
                'user' => $env('MAILER_USER') ?: (isset($fileMailer['user']) ? $fileMailer['user'] : ''),
                'password' => $env('MAILER_PASSWORD') ?: (isset($fileMailer['password']) ? $fileMailer['password'] : ''),
            ),
        );

        if ($loadedFrom === null && $mysqlPassword === null && empty($fileMysql)) {
            error_log('gladcode: no config found (env empty, tried /var/www/private/config.json and ../config/config.json)');
        }

        return $config;
    }

    function gladcode_mailer_config() {
        $config = gladcode_load_config();
        return $config['mailer'];
    }

    $config = gladcode_load_config();
    $host = $config["mysql"]["host"];
    $port = $config["mysql"]["port"];
    $user = $config["mysql"]["user"];
    $password = $config["mysql"]["password"];
    $database = $config["mysql"]["database"];

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET sql_mode='TRADITIONAL'"
    ];

    $conn = new PDO(
        "mysql:host=$host:$port;dbname=$database",
        $user,
        $password,
        $options
    );


    function runQuery($sql, $data = null){
        global $conn;
        try {
            if ($data){
                $stmt = $conn->prepare($sql);
                $stmt->execute($data);
                $result = $stmt;
            }
            else{
                $result = $conn->query($sql);
            }
            if(!$result){
                $error = array(
                    'status' => "SQLERROR",
                    'message' => $conn->error,
                    'sql' => $sql
                );
                die(json_encode($error));
            }
        }
        catch(PDOException $e){
            $error = array(
                'status' => "SQLERROR",
                'message' => $e->getMessage(),
                'sql' => $sql
            );
            die(json_encode($error));
        }
        return $result;
    }
?>
