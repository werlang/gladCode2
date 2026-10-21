<?php
/**
 * Unit tests for tournament_forfeit.php.
 * Validates culprit detection from errorc.txt, forfeit dummy generation and the forfeit DB updates.
 */

require __DIR__ . '/../public_html/tournament_forfeit.php';

// Fake runQuery() recording every call instead of touching the database
$queries = [];
$groupRow = ['team' => 7, 'round' => 3];

class FakeStatement {
    private $row;
    public function __construct($row) { $this->row = $row; }
    public function fetch() { return $this->row; }
}

function runQuery($sql, $data = null) {
    global $queries, $groupRow;
    $queries[] = ['sql' => $sql, 'data' => $data];
    return new FakeStatement(strpos($sql, 'SELECT') === 0 ? $groupRow : false);
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

echo "=== Running Tournament Forfeit Unit Tests ===\n";

// find_failed_glads()
$gccError = "code1.c: In function 'loop':\ncode1.c:12:5: error: expected ';' before '}' token\n";
assertCondition('GCC syntax error blames code1', find_failed_glads($gccError, 3) === [1]);

$ldError = "/usr/bin/ld: /tmp/ccA1b2.o: in function `loop':\ncode2.c:(.text+0x1e): undefined reference to `foo'\ncollect2: error: ld returned 1 exit status\n";
assertCondition('Linker undefined reference blames code2', find_failed_glads($ldError, 3) === [2]);

$warning = "code0.c:4:1: warning: return type defaults to 'int' [-Wimplicit-int]\n";
assertCondition('GCC warnings alone blame nobody', find_failed_glads($warning, 3) === []);

$pyError = "Traceback (most recent call last):\n  File \"code0.py\", line 20, in <module>\n    loop()\n  File \"/usercode/abc/code0.py\", line 9, in loop\n    foo()\nNameError: name 'foo' is not defined\n";
assertCondition('Python traceback blames code0 once', find_failed_glads($pyError, 3) === [0]);

assertCondition('Several broken gladiators are all blamed, sorted',
    find_failed_glads($pyError . $gccError . $ldError, 3) === [0, 1, 2]);

assertCondition('Indexes beyond the battle size are ignored', find_failed_glads("code7.c:1:1: error: x\n", 3) === []);
assertCondition('Runner errors without a culprit blame nobody', find_failed_glads("CURL Error: timeout", 3) === []);
assertCondition('Unrelated files (gladCodeAPI.c) blame nobody', find_failed_glads("gladCodeAPI.c:10:1: error: x\n", 3) === []);

// forfeit_code()
$cSetup = "setup(){\n    setName(\"Brutus@pablo\");\n    setSTR(10);\n    setAGI(10);\n    setINT(10);\n    setSlots(\"0,0,0,0\");\n}\n\n";
$cDummy = forfeit_code($cSetup . "loop(){\n    stepForward(\n}\n", "c");
assertCondition('C dummy keeps the generated setup', strpos($cDummy, $cSetup) === 0);
assertCondition('C dummy drops the broken user code', strpos($cDummy, 'stepForward') === false);
assertCondition('C dummy speaks and idles', strpos($cDummy, "speak(\"Desclassificado\");") !== false && strpos($cDummy, "turn(0);") !== false);

$pySetup = "def setup():\n    setName(\"Brutus@pablo\")\n    setSTR(10)\n    setAGI(10)\n    setINT(10)\n    setSlots(\"0,0,0,0\")\n# start of user code\n";
$pyDummy = forfeit_code($pySetup . "def loop():\n    foo(\n", "python");
assertCondition('Python dummy keeps the generated setup', strpos($pyDummy, $pySetup) === 0);
assertCondition('Python dummy drops the broken user code', strpos($pyDummy, 'foo(') === false);
assertCondition('Python dummy defines loop() (language detection)', strpos($pyDummy, "def loop():") !== false);
assertCondition('Python dummy speaks and idles', strpos($pyDummy, "speak(\"Desclassificado\")") !== false && strpos($pyDummy, "turn(0)") !== false);

// forfeit_glads()
$queries = [];
forfeit_glads([42], 5);
assertCondition('Flags gladiator as broken with bound parameter',
    $queries[0]['sql'] === "UPDATE gladiators SET version = 'broken' WHERE cod = :cod" && $queries[0]['data'] === [':cod' => 42]);
assertCondition('Looks up team and round of the gladiator in the group',
    $queries[1]['data'] === [':groupid' => 5, ':cod' => 42]);
assertCondition('Marks gladiator dead in the current round of its team',
    $queries[2]['sql'] === "UPDATE gladiator_teams SET dead = :round WHERE gladiator = :cod AND team = :team"
    && $queries[2]['data'] === [':round' => 3, ':cod' => 42, ':team' => 7]);

$queries = [];
$groupRow = false;
forfeit_glads([42], 5);
assertCondition('Gladiator not in group: flagged broken but no dead update', count($queries) === 2);

echo "\nSummary: $passed passed, $failed failed.\n";
exit($failed === 0 ? 0 : 1);
