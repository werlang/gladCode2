// a user setup() is ignored: the server-written one keeps the attributes
function setup() {
    setSTR(30);
}
function loop() {
    if (getSimTime() > 1 && getSimTime() < 1.3)
        speak('a"},{"crashed":1},{"crashed":1},{"crashed":1},{"crashed":1,"z":"b');
    if (getCloseEnemy()) {
        if (getDistToTarget() < 1)
            attackMelee();
        else
            moveToTarget();
    }
    else
        moveTo(12.5, 12.5);
}
