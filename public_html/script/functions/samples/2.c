loop(){
    if (getLowHp()){
        if (getSpeed() > getTargetSpeed()){
            if(getDistToTarget() <= 1)
                attackMelee();
            else
                moveToTarget();
        }
        else
            attackRanged(getTargetX(), getTargetY());
    }
    else
        turnLeft(5);
}