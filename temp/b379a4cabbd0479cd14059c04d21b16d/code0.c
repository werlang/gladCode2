#include "gladCodeCore.c"
setup(){
    setName("Arch@user0");
    setSTR(6);
    setAGI(20);
    setINT(0);
    
}

int f = 0;

loop(){
	upgradeAGI(1);
	if (!getCloseEnemy()){
		if (f)
			turnRight(100);
		else if (moveTo(12.5,12.5))
			f = 1;
	}
	else
		attackRanged(getTargetX(), getTargetY());
}