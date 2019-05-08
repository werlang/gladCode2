#include "gladCodeCore.c"
setup(){
	setName("Cinder@Thrash Garbage");
	setSTR(5);
	setAGI(0);
	setINT(9);
}

loop(){
	upgradeINT();
	if(getLowHp()){
		if (getAp() >= 40)
			fireball(getTargetX(), getTargetY());
		else
			attackRanged(getTargetX(), getTargetY());
	}
	else{
		while(getX() != 12.5 || getY() != 12.5)
			teleport(12.5,12.5);
		turn(50);
	}

}
	