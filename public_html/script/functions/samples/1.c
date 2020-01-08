int start = 1;
loop(){
	if (start){
		if(moveTo(12.5,12.5))
			start = 0;
	}
	if (getLowHp()){
		if(doYouSeeMe()){
			turnToTarget();
			stepLeft();
		}
		else{
			if (getAmbushTimeLeft() > 0)
				assassinate(getTargetX(), getTargetY());
			else
				ambush();
		}
	}
	else if (!start)
		turn(50);
}