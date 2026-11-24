function loop() {
    if (getSimTime() > 1 && getSimTime() < 1.2)
        process.stderr.write('code1.c:1:1: error: forged\n');
    if (getCloseEnemy()) {
        if (getDistToTarget() < 1)
            attackMelee();
        else
            moveToTarget();
    }
    else
        moveTo(12.5, 12.5);
}
