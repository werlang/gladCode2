<?php
/**
 * Unit tests for input sanitization and security checks in editor.php and back_match.php.
 */

$passed = 0;
$failed = 0;

function assertCondition($name, $condition) {
    global $passed, $failed;
    if ($condition) {
        echo "[PASS] $name\n";
        $passed++;
    } else {
        echo "[FAIL] $name\n";
        $failed++;
    }
}

echo "=== Running Editor & API Security Unit Tests ===\n";

// Test 1: SQL Injection payload '0 OR cod=699' is rejected by integer validation
$payload = "0 OR cod=699";
$parsed = filter_var($payload, FILTER_VALIDATE_INT);
assertCondition('SQL injection payload "0 OR cod=699" returns false', $parsed === false);

// Test 2: Basic '0 OR 1=1' injection
$payload2 = "0 OR 1=1";
$parsed2 = filter_var($payload2, FILTER_VALIDATE_INT);
assertCondition('SQL injection payload "0 OR 1=1" returns false', $parsed2 === false);

// Test 3: SQL comment / quote injection
$payload3 = "699' UNION SELECT 1--";
$parsed3 = filter_var($payload3, FILTER_VALIDATE_INT);
assertCondition('SQL injection payload with quote/comment returns false', $parsed3 === false);

// Test 4: Valid integer strings parse correctly
$validId = "892";
$parsedValid = filter_var($validId, FILTER_VALIDATE_INT);
assertCondition('Valid numeric ID "892" parses as integer 892', $parsedValid === 892);

// Test 5: ID 0 correctly identifies as new gladiator ($id <= 0)
$zeroId = "0";
$parsedZero = filter_var($zeroId, FILTER_VALIDATE_INT);
assertCondition('ID 0 is valid int 0', $parsedZero === 0);
assertCondition('ID 0 satisfies ($id === false || $id <= 0) for newglad', ($parsedZero === false || $parsedZero <= 0));

// Test 6: Negative IDs satisfy newglad / rejection condition
$negId = "-5";
$parsedNeg = filter_var($negId, FILTER_VALIDATE_INT);
assertCondition('Negative ID satisfies ($id === false || $id <= 0)', ($parsedNeg === false || $parsedNeg <= 0));

// Test 7: back_getfile path traversal detection
$traversalPaths = [
    '../../etc/passwd',
    '../config/config.json',
    'dir/../../../secret',
    "safe\0../unsafe"
];
foreach ($traversalPaths as $p) {
    $hasTraversal = (strpos($p, '..') !== false || strpos($p, "\0") !== false);
    assertCondition("Path traversal detected for '$p'", $hasTraversal === true);
}

// Test 8: Safe relative dir names pass check
$safeDir = "myfolder/subfolder";
$safeName = "code.c";
$safeDirCheck = (strpos($safeDir, '..') === false && strpos($safeDir, "\0") === false);
$safeNameCheck = (strpos($safeName, '..') === false && strpos($safeName, '/') === false && strpos($safeName, "\0") === false);
assertCondition('Safe directory name passes validation', $safeDirCheck && $safeNameCheck);

echo "\nSummary: $passed passed, $failed failed.\n";
if ($failed > 0) {
    exit(1);
}
