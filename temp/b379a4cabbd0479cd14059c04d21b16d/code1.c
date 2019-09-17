#include "gladCodeCore.c"
setup(){
    setName("War Maker@user1");
    setSTR(18);
    setAGI(4);
    setINT(8);
    
}

float hp;

loop(){
	upgradeSTR(1);
	if (!isSafeHere()){
		int i=0;
		for (i=0 ; i<10 ; i++)
			moveTo(12.5,12.5);
	}
	else{
		int hit = 0;
		if (hp != getHp()){
			hp = getHp();
			hit = 1;
		}

		if (hit){
			turnToAngle(getLastHitAngle());
			if (getBlockTimeLeft() < 1.5 && getAp() >= 50)
				block();
		}
		
		if (getLowHp()){
			if (getDist(getTargetX(), getTargetY()) > 2 && getAp() >= 40)
				charge();
			else if (getDist(getTargetX(), getTargetY()) <= 1)
				attackMelee();
			else
				moveTo(getTargetX(), getTargetY());
		}
		else{
			if (moveTo(12.5,12.5))
				turn(50);
		}
	}
}
	