loop(){
    while(!moveTo(12.5,12.5));
    if(turnLeft(45) >= 45)
        upgradeSTR(5);
    if (getLowHp())
        attackRanged(getTargetX(), getTargetY());
}