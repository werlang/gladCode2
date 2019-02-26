setup(){
    setName("Rogue");
    setSTR(0);
    setAGI(10);
    setINT(3);
    setSpritesheet("19bfabb3fb3ff3a8c6bdb781adb9ce37");
}

int start = 1;

loop(){
	upgradeAGI();
	if (start){
		if(moveTo(12.5,12.5))
			start = 0;
	}
	
	if (getLowHp()){
		if(doYouSeeMe()){
			if (getAmbushTimeLeft() <= 0){
				ambush();
			}
			else{
				turnTo(getTargetX(), getTargetY());
				stepLeft();
			}
		}
		else{
			if (getAmbushTimeLeft() > 0){
				attackRanged(getTargetX(), getTargetY());
				assassinate(getTargetX(), getTargetY());
			}
			else{
				ambush();
			}
		}
		
	}
	else if (!start)
		turn(50);
}