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

# battle <case> <glad files...>: builds the run dir like the API's model/battle.js and runs it (60s cap)
battle(){
    local case=$1; shift
    local dir=$ROOT/$case i=0 f
    rm -rf "$dir"; mkdir -p "$dir"; cp "$REPO"/Payload/* "$dir/"
    for f in "$@"; do
        if [[ $f == *.py ]]; then
            { printf 'from gladCodeAPI import *\n\n'
              printf 'def setup():\n    setName("G%s@nick%s")\n    setSTR(10)\n    setAGI(14)\n    setINT(9)\n    setSlots("0,0,0,0")\n# start of user code\n' $i $i
              cat "$GLADS/$f"
              printf '\n\ninitClient()\nsetup()\nif startSim():\n    while running():\n        loop()\n'; } > "$dir/code$i.py"
        else
            { printf '#include "gladCodeCore.c"\n'
              printf 'setup(){\n    setName("G%s@nick%s");\n    setSTR(10);\n    setAGI(14);\n    setINT(9);\n    setSlots("0,0,0,0");\n}\n\n' $i $i
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

echo "=== Running Engine Battle Tests ==="
battle healthy fighter.py fighter.c;                      expect healthy ""
battle healthy5 fighter.py fighter.c fighter.py fighter.c fighter.py; expect healthy5 ""
# crashes on the first turn used to corrupt the log only intermittently, so they run several times
for n in 1 2 3 4 5; do
    battle py_first_$n fighter.c pycrash_first.py;        expect py_first_$n "G1"
    battle c_first_$n ccrash_first.c fighter.py;          expect c_first_$n "G0"
done
battle py_mid pycrash_mid.py fighter.c;                   expect py_mid "G0"
battle c_mid ccrash_mid.c fighter.py;                     expect c_mid "G0"
battle mixed5 fighter.c pycrash_mid.py fighter.py ccrash_mid.c fighter.py; expect mixed5 "G1,G3"
battle stderr_forge pyforge_mid.py fighter.c;             expect stderr_forge ""
battle speak_inject fighter.c pyinject.py fighter.py;     expect speak_inject ""

rm -rf "$ROOT"
echo
echo "Summary: $failed failed."
exit $([ $failed -eq 0 ] && echo 0 || echo 1)
