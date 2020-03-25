loop(){
    while(!moveTo(12.5,12.5));
    if(turnRight(45) >= 45)
        upgradeSTR();
    if (getLowHp())
        attackRanged(getTargetX(), getTargetY());
}