int start = 1;
loop(){
	if (start){
		if(moveTo(12.5,12.5))
			start = 0;
	}
	if(getLowHp())
		charge();
	else if (!start)
		turn(50);
}