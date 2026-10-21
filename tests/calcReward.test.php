<?php
/**
 * Unit tests for calcReward() from battle_results.php.
 * Validates division by zero edge cases, MMR deviations, and reward weighting.
 */

require __DIR__ . '/../public_html/battle_results.php';

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

echo "=== Running calcReward Unit Tests ===\n";

// Test 1: All gladiators have MMR = 0 (the bug reported)
try {
    $gladsMmrZero = [
        ['id' => 1, 'mmr' => 0, 'time' => 100],
        ['id' => 2, 'mmr' => 0, 'time' => 80],
        ['id' => 3, 'mmr' => 0, 'time' => 60],
        ['id' => 4, 'mmr' => 0, 'time' => 40],
        ['id' => 5, 'mmr' => 0, 'time' => 20],
    ];
    $rewards = calcReward($gladsMmrZero);
    assertCondition('All MMR 0 gladiators: does not throw DivisionByZeroError', true);
    assertCondition('Winner gets positive reward (10)', abs($rewards[0] - 10) < 0.01);
    assertCondition('Zero MMR gladiators do not drop below 0 (bias protection)', $rewards[4] >= 0);
} catch (Throwable $e) {
    assertCondition('All MMR 0 gladiators: unexpected exception ' . $e->getMessage(), false);
}

// Test 2: Standard match with varied MMRs
try {
    $gladsNormal = [
        ['id' => 1, 'mmr' => 1200, 'time' => 120],
        ['id' => 2, 'mmr' => 1100, 'time' => 90],
        ['id' => 3, 'mmr' => 1300, 'time' => 70],
        ['id' => 4, 'mmr' => 1050, 'time' => 50],
        ['id' => 5, 'mmr' => 1150, 'time' => 30],
    ];
    $rewards = calcReward($gladsNormal);
    assertCondition('Standard match: calculated 5 rewards', count($rewards) === 5);
    assertCondition('Winner gets maximum base reward', $rewards[0] > 0);
    assertCondition('Last place gets negative reward', $rewards[4] < 0);
} catch (Throwable $e) {
    assertCondition('Standard match: unexpected exception ' . $e->getMessage(), false);
}

// Test 3: Complete tie (all died at time 0 -> rewardWeighted[0] == 0)
try {
    $gladsTie = [
        ['id' => 1, 'mmr' => 0, 'time' => 0],
        ['id' => 2, 'mmr' => 0, 'time' => 0],
        ['id' => 3, 'mmr' => 0, 'time' => 0],
    ];
    $rewards = calcReward($gladsTie);
    assertCondition('Complete tie with rewardWeighted[0] == 0: handles without exception', true);
    assertCondition('Complete tie rewards are all 0', array_sum($rewards) == 0);
} catch (Throwable $e) {
    assertCondition('Complete tie: unexpected exception ' . $e->getMessage(), false);
}

echo "\nSummary: $passed passed, $failed failed.\n";
exit($failed === 0 ? 0 : 1);
