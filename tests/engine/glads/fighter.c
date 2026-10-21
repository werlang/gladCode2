loop(){
    if (getCloseEnemy()){
        if (getDistToTarget() < 1)
            attackMelee();
        else
            moveToTarget();
    }
    else
        moveTo(12.5, 12.5);
}
