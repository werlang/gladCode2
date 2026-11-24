function loop() {
    if (!isTargetVisible())
        getLowHp();
    else{
        if (Math.abs(getHead() - getTargetHead()) >= 90){
            stepLeft();
            turnToTarget();
        }
        else
            attackRanged(getTargetX(), getTargetY());
    }
}