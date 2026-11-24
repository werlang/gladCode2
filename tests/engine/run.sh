#!/bin/bash
# Engine regression battles: runs real battles in the gladcode2-vm image and checks the simlog
# the way the API reads it (valid JSON, crashed gladiators via crashedGladiators() from
# api/helpers/battle-results.js).
# Usage (repo root, Docker running, gladcode2-vm image built): bash tests/engine/run.sh
# Run dirs go to data/runs/engine_test/ (gitignored, mountable by Docker Desktop) and are removed at the end.

REPO=$(cd "$(dirname "$0")/../.." && pwd)
GLADS=$REPO/tests/engine/glads
ROOT=$REPO/data/runs/engine_test
failed=0

# battle <case> <glad files...>: builds the run dir like the API's model/battle.js and runs it (60s cap);
# CRLF=1 writes the JavaScript files with Windows line endings
battle(){
    local case=$1; shift
    local dir=$ROOT/$case i=0 f name
    rm -rf "$dir"; mkdir -p "$dir"; cp "$REPO"/Payload/* "$dir/"
    for f in "$@"; do
        # The engine assigns IDs in connection order, which is nondeterministic for Node clients.
        # Name each fixture by source and position so assertions never depend on accept order.
        name=${f%.*}; name=${name//[^[:alnum:]_]/_}; name=${name}_$i
        if [[ $f == *.py ]]; then
            { printf 'from gladCodeAPI import *\n\n'
              printf 'def setup():\n    setName("%s@nick%s")\n    setSTR(10)\n    setAGI(14)\n    setINT(9)\n    setSlots("0,0,0,0")\n# start of user code\n' "$name" "$i"
              cat "$GLADS/$f"
              printf '\n\ninitClient()\nsetup()\nif startSim():\n    while running():\n        loop()\n'; } > "$dir/code$i.py"
        elif [[ $f == *.js ]]; then
            { printf 'function setup() {\n    setName("%s@nick%s");\n    setSTR(10);\n    setAGI(14);\n    setINT(9);\n    setSlots("0,0,0,0");\n}\n// start of user code\n' "$name" "$i"
              cat "$GLADS/$f"; } > "$dir/code$i.js"
            [ -n "$CRLF" ] && sed -i.bak 's/$/\r/' "$dir/code$i.js" && rm "$dir/code$i.js.bak"
        else
            { printf '#include "gladCodeCore.c"\n'
              printf 'setup(){\n    setName("%s@nick%s");\n    setSTR(10);\n    setAGI(14);\n    setINT(9);\n    setSlots("0,0,0,0");\n}\n\n' "$name" "$i"
              cat "$GLADS/$f"; } > "$dir/code$i.c"
        fi
        i=$((i+1))
    done
    docker run -d --name "engine_test_$case" -v "$dir":/usercode -w /usercode gladcode2-vm sh socket_compile.sh > /dev/null
    for t in $(seq 1 60); do
        [ "$(docker inspect -f '{{.State.Running}}' "engine_test_$case" 2>/dev/null)" = "true" ] || break
        sleep 1
    done
    docker rm -f "engine_test_$case" > /dev/null 2>&1
}

# expect <case> <crashed names, comma separated or empty>
expect(){
    local got
    got=$(docker run --rm -v "$REPO":/w -w /w node:22-alpine node --input-type=module -e '
        import { readFileSync } from "node:fs";
        import { crashedGladiators } from "./api/helpers/battle-results.js";
        let log;
        try { log = JSON.parse("[" + readFileSync(process.argv[1], "utf8") + "]"); } catch { log = []; }
        if (!log.length) { process.stdout.write("NO_VALID_LOG"); process.exit(); }
        const names = log[0].glads.map(glad => glad.name);
        process.stdout.write(crashedGladiators(log).map(index => names[index]).sort().join(","));' "data/runs/engine_test/$1/simlog")
    if [ "$got" = "$2" ]; then
        echo "[PASS] $1: crashed=[$got]"
    else
        echo "[FAIL] $1: expected crashed=[$2], got [$got]"
        failed=$((failed+1))
    fi
}

# expect_error <case> <text>: the battle wrote no log and errorc.txt names the error
expect_error(){
    local dir=$ROOT/$1
    if [ ! -s "$dir/simlog" ] && grep -q "$2" "$dir/errorc.txt" 2>/dev/null; then
        echo "[PASS] $1: no log, errorc has '$2'"
    else
        echo "[FAIL] $1: expected no log and '$2' in errorc.txt, got: $(head -c 300 "$dir/errorc.txt" 2>/dev/null)"
        failed=$((failed+1))
    fi
}

# expect_said <case> <text>: some gladiator said this (speak) in the battle
expect_said(){
    if grep -q "\"message\":\"$2\"" "$ROOT/$1/simlog" 2>/dev/null; then
        echo "[PASS] $1: said '$2'"
    else
        echo "[FAIL] $1: nobody said '$2'"
        failed=$((failed+1))
    fi
}

# expect_str <case> <gladiator> <STR>: the gladiator fought with this strength (its setup() was the server's)
expect_str(){
    if grep -q "\"name\":\"$2\",[^{}]*\"STR\":$3," "$ROOT/$1/simlog" 2>/dev/null; then
        echo "[PASS] $1: $2 STR=$3"
    else
        echo "[FAIL] $1: expected $2 with STR=$3"
        failed=$((failed+1))
    fi
}

echo "=== Running Engine Battle Tests ==="
battle healthy fighter.py fighter.c;                      expect healthy ""
battle healthy5 fighter.py fighter.c fighter.py fighter.c fighter.py; expect healthy5 ""
# crashes on the first turn used to corrupt the log only intermittently, so they run several times
for n in 1 2 3 4 5; do
    battle py_first_$n fighter.c pycrash_first.py;        expect py_first_$n "pycrash_first_1"
    battle c_first_$n ccrash_first.c fighter.py;          expect c_first_$n "ccrash_first_0"
done
battle py_mid pycrash_mid.py fighter.c;                   expect py_mid "pycrash_mid_0"
battle c_mid ccrash_mid.c fighter.py;                     expect c_mid "ccrash_mid_0"
battle mixed5 fighter.c pycrash_mid.py fighter.py ccrash_mid.c fighter.py; expect mixed5 "ccrash_mid_3,pycrash_mid_1"
battle stderr_forge pyforge_mid.py fighter.c;             expect stderr_forge ""
battle speak_inject fighter.c pyinject.py fighter.py;     expect speak_inject ""

# JavaScript gladiators
battle js_healthy fighter.js fighter.c fighter.py;        expect js_healthy ""
battle js_arrow jsarrow.js fighter.js;                    expect js_arrow ""
for n in 1 2 3; do
    battle js_first_$n fighter.c jscrash_first.js;        expect js_first_$n "jscrash_first_1"
done
battle js_mid jscrash_mid.js fighter.py;                  expect js_mid "jscrash_mid_0"
battle js_mixed5 fighter.js jscrash_mid.js fighter.py ccrash_mid.c pycrash_mid.py; expect js_mixed5 "ccrash_mid_3,jscrash_mid_1,pycrash_mid_4"
battle js_stderr_forge jsforge_mid.js fighter.c;          expect js_stderr_forge ""
battle js_speak_inject fighter.c jsinject.js fighter.js;  expect js_speak_inject ""; expect_str js_speak_inject jsinject_1 10
battle js_syntax jssyntax.js fighter.c;                   expect_error js_syntax "SyntaxError"
battle js_speak_long jsspeak_long.js jsarrow.js;          expect js_speak_long ""; expect_said js_speak_long depois
CRLF=1 battle js_crlf jsinject.js fighter.c;              expect js_crlf ""; expect_str js_crlf jsinject_0 10

rm -rf "$ROOT"
echo
echo "Summary: $failed failed."
exit $([ $failed -eq 0 ] && echo 0 || echo 1)
