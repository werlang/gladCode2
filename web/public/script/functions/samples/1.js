let start = true;
function loop() {
    if (start){
        if(moveTo(12.5,12.5))
            start = false;
    }
    if (getLowHp()){
        if(doYouSeeMe()){
            turnToTarget();
            stepLeft();
        }
        else{
            if (getAmbushTimeLeft() > 0){
                if (isStunned() && !doYouSeeMe())
                    assassinate(getTargetX(), getTargetY());
                else if (getAmbushTimeLeft() <= 1)
                    attackRanged(getTargetX(), getTargetY());
            }
            else
                ambush();
        }
    }
    else if (!start)
        turn(50);
}