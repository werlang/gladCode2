#include "gladCodeCore.c"
setup(){
	setName("krj8m@krj4m");
	setSTR(0);
	setAGI(10);
	setINT(3);
}

int start=1;
int goToMiddle = 1;
float r = 1;
int turner = 0;

loop(){
    walkInSafezone();
    esquiva();
    attack();
    upgrade();
}
do360(){
    turn(45);
    turn(45);
    turn(45);
    turn(45);
    turn(45);
    turn(45);
    turn(45);
    turn(45);
}

walkInSafezone(){
    if(getDist(12.5, 12.5) >= getSafeRadius()-2){
        r = 12.5 - getSafeRadius()/2;
        moveTo(25-r,25-r);
    }
}

esquiva(){
    if (getHit()){
        turnToLastHit();
	    ambush();
	    if(isSafeThere(getX()+1, getY()-1)){
	        stepRight();
	        stepBack();
	    }else{
	        turnTo(12.5,12.5);
	        stepLeft();
	        stepForward();
	    }
    }
}


stunThemAll(){
    if(!isStunned() && getAp() >= 30 && getAmbushTimeLeft() >= 1){
        turnToTarget();
        assassinate(getTargetX(), getTargetY());
    }else if(!isStunned() && getAp() >= 90){
        ambush();
        turnToTarget();
        assassinate(getTargetX(), getTargetY());
    }
}

getThemAll(){
    if(isStunned() && getAp() > 30 && isSafeThere(getTargetX(), getTargetY())){
        turnToTarget();
        charge();
    }
}

attack(){
    stunThemAll();
    getThemAll();

    if(getDistToTarget() > 2){
        attackRanged(getTargetX(), getTargetY());
    }else if(getDistToTarget() < 1){
        attackMelee();
    }
    
}

upgrade(){
    if (getAGI() >= 15)
        upgradeINT();
    else
        upgradeAGI();
}