loop(){
	if (getSTR() >= 15)
		upgradeAGI();
	else
		upgradeSTR();
	while(!moveTo(5,20));
	while(!moveTo(20,5));
}