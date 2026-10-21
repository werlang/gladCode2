<?php
    // Battle result helpers shared by back_simulation.php, kept free of top-level code so they can be unit tested.

    // error to report for a finished run. Battles between saved gladiators are judged by the engine log alone:
    // a gladiator that crashes mid-battle is killed by the engine, so stderr (which every gladiator can write to)
    // must not discard a valid log. Editor runs keep any error so the user sees it and cannot save broken code.
    // $counts is !$sandbox from back_simulation.php, so this and the engine sandbox mode share one definition
    function battle_error($counts, $simlog, $error){
        if ($counts && !empty(json_decode($simlog, true)))
            return "";
        return $error;
    }

    // log indexes of the gladiators the engine flagged as crashed (client process died while the gladiator was alive).
    // Indexes beyond the battle size are ignored, as defense in depth against entries injected into the log
    function crashed_glads($log){
        $nglads = count($log[0]['glads']);
        $crashed = array();
        foreach ($log as $step){
            foreach ($step['glads'] as $i => $glad){
                if ($i < $nglads && !empty($glad['crashed']))
                    $crashed[$i] = true;
            }
        }
        return array_keys($crashed);
    }

    // flags crashed gladiators as broken, dropping them from the matchmaking pool until their owner saves them again.
    // $deaths comes from death_times(), keyed by log index, with the gladiator cod in 'id'
    function flag_broken_glads($indexes, $deaths){
        foreach ($indexes as $i){
            if (isset($deaths[$i]['id']))
                runQuery("UPDATE gladiators SET version = 'broken' WHERE cod = :cod", [':cod' => $deaths[$i]['id']]);
        }
    }

    function calcReward($glads){
        $maxReward = 10;
        $timeWeight = 1.5;
        $winWeight = 1;
        $nglad = count($glads);

        $rewardRaw = array();
        $timeDiff = $glads[1]['time'] - $glads[$nglad-1]['time'];

        $avgmmr = 0;
        foreach($glads as $i => $glad){
            $diff = $glad['time'] - $glads[$nglad-1]['time'];
            if ($timeDiff == 0)
                $timeNorm = 1;
            else
                $timeNorm = $diff/$timeDiff;

            $win = 0;
            if ($i == 0 || $glad['time'] == $glads[0]['time']){
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

        foreach($glads as $i => $glad){
            $rewardWeighted[$i] = $rewardRaw[$i] - $evenReward;
            $rewardNorm = ($rewardWeighted[0] != 0) ? ($rewardWeighted[$i] / $rewardWeighted[0] * $maxReward) : 0;

            $mmrDev = ($avgmmr > 0) ? ($glad['mmr'] / $avgmmr) : 1;

            if ($rewardNorm > 0)
                $rewardDev[$i] = $rewardNorm / max($mmrDev, 0.5);
            else
                $rewardDev[$i] = $rewardNorm * min($mmrDev, 2);

            //faz perder menos quanto mais próximo de mmr 0
            if ($rewardDev[$i] < 0 && $glad['mmr'] < 1000){
                $bias = 0.001 * $glad['mmr'] - 1;
                $rewardDev[$i] = $rewardDev[$i] + $rewardDev[$i] * $bias;
            }
        }

        return $rewardDev;
    }
?>
