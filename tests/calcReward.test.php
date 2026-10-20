<?php
/**
 * Unit tests for calcReward() logic from back_simulation.php.
 * Validates division by zero edge cases, MMR deviations, and reward weighting.
 */

// Isolated pure function version of calcReward for unit testing
function calcReward(array $glads): array {
    $maxReward = 10;
    $timeWeight = 1.5;
    $winWeight = 1;
    $nglad = count($glads);
    
    $rewardRaw = array();
    $timeDiff = $glads[1]['time'] - $glads[$nglad - 1]['time'];
    
    $avgmmr = 0;
    foreach ($glads as $i => $glad) {
        $diff = $glad['time'] - $glads[$nglad - 1]['time'];
        if ($timeDiff == 0) {
            $timeNorm = 1;
        } else {
            $timeNorm = $diff / $timeDiff;
        }

        $win = 0;
        if ($i == 0 || $glad['time'] == $glads[0]['time']) {
            $win = 1;
            $timeNorm = 1;
        }
        $rewardRaw[$i] = ($timeNorm * $nglad * $timeWeight) + ($win * $nglad * $winWeight);
        $avgmmr += $glad['mmr'];
    }
    $avgmmr /= $nglad;
    $evenReward = array_sum($rewardRaw) / $nglad;
    $rewardWeighted = array();
    $rewardDev = array();
    
    foreach ($glads as $i => $glad) {
        $rewardWeighted[$i] = $rewardRaw[$i] - $evenReward;
        $rewardNorm = ($rewardWeighted[0] != 0) ? ($rewardWeighted[$i] / $rewardWeighted[0] * $maxReward) : 0;

        $mmrDev = ($avgmmr > 0) ? ($glad['mmr'] / $avgmmr) : 1;
        
        if ($rewardNorm > 0) {
            $rewardDev[$i] = $rewardNorm / max($mmrDev, 0.5);
        } else {
            $rewardDev[$i] = $rewardNorm * min($mmrDev, 2);
        }
        
        // faz perder menos quanto mais próximo de mmr 0
        if ($rewardDev[$i] < 0 && $glad['mmr'] < 1000) { 
            $bias = 0.001 * $glad['mmr'] - 1;
            $rewardDev[$i] = $rewardDev[$i] + $rewardDev[$i] * $bias;
        }
    }		
    
    return $rewardDev;
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
