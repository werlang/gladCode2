setup(){
    setName("Runner");
    setSTR(6);
    setAGI(8);
    setINT(1);
    setSpritesheet("5d5a8e60d49d40c58b60f66a08dfd93e");
}

loop(){
	if (getHit()){
		turnToAngle(getLastHitAngle());
		while (howManyEnemies() > 0)
			stepBack();
	}
	else{
		while (!isSafeHere() && !getHit()){
			moveTo(12,12);
		}
		while (!getHit() && isSafeHere() && !moveTo(20,5));
		while (!getHit() && isSafeHere() && !moveTo(5,20));
	}
	
}