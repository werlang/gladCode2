loop(){
	while(!moveTo(12.5,12.5));
	if(turnLeft(45) >= 45)
		upgradeSTR();
	if (getLowHp())
		attackRanged(getTargetX(), getTargetY());
}