<?php
/**
 * Unit tests for the crash helpers in battle_results.php.
 * Validates reading the engine's `crashed` flag from a simlog and flagging crashed gladiators as broken.
 * fixtures/simlog_python_crash.json is a real gladcode2-vm log: G0 (Python) raises NameError at simtime > 3.
 */

require __DIR__ . '/../public_html/battle_results.php';

// Fake runQuery() recording every call instead of touching the database
$queries = [];

function runQuery($sql, $data = null) {
    global $queries;
    $queries[] = ['sql' => $sql, 'data' => $data];
}

// Test Runner
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

echo "=== Running Battle Results Unit Tests ===\n";

// crashed_glads()
$crashLog = json_decode(file_get_contents(__DIR__ . '/fixtures/simlog_python_crash.json'), true);
assertCondition('Real engine log: crashed Python gladiator (index 0) is detected', crashed_glads($crashLog) === [0]);

$healthyLog = [
    ['simtime' => 0.1, 'glads' => [['name' => 'A', 'hp' => 200, 'crashed' => 0], ['name' => 'B', 'hp' => 200, 'crashed' => 0]]],
    ['simtime' => 0.2, 'glads' => [['hp' => 150], []]],
    ['simtime' => 9.0, 'glads' => [['hp' => 0], []]],
];
assertCondition('Gladiator killed in combat is not crashed', crashed_glads($healthyLog) === []);

$firstStepCrash = [
    ['simtime' => 0.1, 'glads' => [['hp' => 200, 'crashed' => 0], ['hp' => 0, 'crashed' => 1], ['hp' => 200, 'crashed' => 1]]],
    ['simtime' => 0.2, 'glads' => [[], [], []]],
];
assertCondition('Crash recorded in the first full step is detected for every gladiator', crashed_glads($firstStepCrash) === [1, 2]);

$legacyLog = [['simtime' => 0.1, 'glads' => [['hp' => 200], ['hp' => 200]]]];
assertCondition('Logs from engines without the crashed field blame nobody', crashed_glads($legacyLog) === []);

$injectedLog = [
    ['simtime' => 0.1, 'glads' => [['hp' => 200, 'crashed' => 0], ['hp' => 200, 'crashed' => 0]]],
    ['simtime' => 1.1, 'glads' => [['message' => 'a'], ['crashed' => 1], ['crashed' => 1]]], // extra entries forged via speak()
];
assertCondition('Entries beyond the battle size are ignored', crashed_glads($injectedLog) === [1]);

// battle_error()
$validLog = '[{"simtime":0.1,"glads":[{"hp":200},{"hp":0}]}]';
$traceback = "Traceback (most recent call last):\n  File \"code1.py\", line 9, in loop\nNameError: name 'x' is not defined\n";
assertCondition('Battle that counts (not sandbox) with a valid log ignores stderr', battle_error(true, $validLog, $traceback) === "");
assertCondition('Editor run (sandbox) keeps the error even with a valid log', battle_error(false, $validLog, $traceback) === $traceback);
assertCondition('Battle that counts with an empty log keeps the error', battle_error(true, '[]', $traceback) === $traceback);
assertCondition('Battle that counts with a truncated log keeps the error', battle_error(true, '[{"simtime":0.1,"gla', $traceback) === $traceback);
assertCondition('Runner failure (no log) keeps the CURL error', battle_error(true, '', 'CURL Error: timeout') === 'CURL Error: timeout');

// flag_broken_glads()
$deaths = [1 => ['name' => 'B', 'id' => 7], 0 => ['name' => 'A', 'id' => 42]]; // death_times() order, keyed by log index
flag_broken_glads([0], $deaths);
assertCondition('Flags the crashed gladiator by its cod with a bound parameter',
    count($queries) === 1
    && $queries[0]['sql'] === "UPDATE gladiators SET version = 'broken' WHERE cod = :cod"
    && $queries[0]['data'] === [':cod' => 42]);

$queries = [];
flag_broken_glads([], $deaths);
assertCondition('No crash: no gladiator flagged', count($queries) === 0);

$queries = [];
flag_broken_glads([1], [1 => ['name' => 'Unknown']]);
assertCondition('Crashed gladiator without a resolved cod is skipped', count($queries) === 0);

echo "\nSummary: $passed passed, $failed failed.\n";
exit($failed === 0 ? 0 : 1);
