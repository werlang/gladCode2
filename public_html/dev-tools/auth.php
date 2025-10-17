<?php
/**
 * Dev Tools Authentication Check
 * 
 * Ensures only admin users can access dev-tools
 * Include this at the top of every dev-tools PHP file
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Change to parent directory for database connection
if (!defined('DEV_TOOLS_AUTH_INCLUDED')) {
    define('DEV_TOOLS_AUTH_INCLUDED', true);
    chdir(__DIR__ . '/..');
    include_once "connection.php";
}

/**
 * Check if user is logged in and is an admin
 * Admins are identified by email in the ADMIN_EMAILS list
 */
function isAdmin() {
    // List of admin emails - UPDATE THIS with your admin email(s)
    $ADMIN_EMAILS = [
        'pswerlang@gmail.com',        // Add your admin email here
    ];
    
    if (!isset($_SESSION['user'])) {
        return false;
    }
    
    global $conn;
    $user_id = $_SESSION['user'];
    
    try {
        $sql = "SELECT email FROM usuarios WHERE id = :id LIMIT 1";
        $stmt = $conn->prepare($sql);
        $stmt->execute(['id' => $user_id]);
        $user = $stmt->fetch();
        
        if ($user && in_array($user['email'], $ADMIN_EMAILS)) {
            return true;
        }
    } catch (PDOException $e) {
        error_log("Dev-tools auth error: " . $e->getMessage());
    }
    
    return false;
}

/**
 * Require admin authentication or die with error
 */
function requireAdmin() {
    if (!isAdmin()) {
        http_response_code(403);
        die(json_encode([
            'status' => 'FORBIDDEN',
            'message' => 'Access denied. Admin privileges required.',
            'hint' => 'Only administrators can access dev-tools'
        ]));
    }
}

// Auto-check authentication unless explicitly disabled
if (!defined('DEV_TOOLS_SKIP_AUTH')) {
    requireAdmin();
}
?>
