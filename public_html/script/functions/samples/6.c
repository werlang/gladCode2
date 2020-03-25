loop(){
    if (!isTargetVisible())
        getLowHp();
    else{
        if (doYouSeeMe()){
            stepLeft();
            turnToTarget();
        }
        else
            attackRanged(getTargetX(), getTargetY());
    }
}