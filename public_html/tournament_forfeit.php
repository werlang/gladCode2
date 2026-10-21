<?php
    // Auto-forfeit of tournament gladiators whose code fails to compile or crashes.
    // A failed battle writes no log, which would stall the whole tournament round,
    // so the broken gladiator is flagged, eliminated and replaced by an idle dummy.

    // indexes (codeX) of the gladiators blamed by gcc/ld or python errors in errorc.txt
    function find_failed_glads($error, $nglads){
        preg_match_all('/\bcode(\d+)\.c:[^\n]*(?:error|undefined reference)|File "(?:[^"\n]*\/)?code(\d+)\.py"/', $error, $matches);

        $failed = array();
        foreach (array_merge($matches[1], $matches[2]) as $i){
            if ($i !== '' && intval($i) < $nglads)
                $failed[intval($i)] = true;
        }
        $failed = array_keys($failed);
        sort($failed);
        return $failed;
    }

    // keeps the generated setup (name@nick and attributes) so the battle log still maps to the gladiator
    function forfeit_code($code, $language){
        if ($language == "python"){
            preg_match('/^def setup\(\):[\w\W]*?\n# start of user code\n/', $code, $setup);
            $loop = "def loop():\n    speak(\"Desclassificado\")\n    turn(0)\n";
        }
        else{
            preg_match('/^setup\(\)\{[\w\W]*?\n\}\n\n/', $code, $setup);
            $loop = "loop(){\n    speak(\"Desclassificado\");\n    turn(0);\n}\n";
        }

        return ($setup[0] ?? "") . $loop;
    }

    // flags gladiators as broken (out of future tournaments and matchmaking) and kills them in this group's round
    function forfeit_glads($cods, $groupid){
        foreach ($cods as $cod){
            runQuery("UPDATE gladiators SET version = 'broken' WHERE cod = :cod", [':cod' => $cod]);

            $sql = "SELECT grt.team, gr.round FROM group_teams grt INNER JOIN `groups` gr ON gr.id = grt.groupid WHERE grt.groupid = :groupid AND grt.gladiator = :cod";
            $row = runQuery($sql, [':groupid' => $groupid, ':cod' => $cod])->fetch();
            if ($row){
                $sql = "UPDATE gladiator_teams SET dead = :round WHERE gladiator = :cod AND team = :team";
                runQuery($sql, [':round' => $row['round'], ':cod' => $cod, ':team' => $row['team']]);
            }
        }
    }
?>
