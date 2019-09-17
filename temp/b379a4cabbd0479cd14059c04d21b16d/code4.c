#include "gladCodeCore.c"
setup(){
	setName("Charlott@Coronel");
	setSTR(6);
	setAGI(16);
	setINT(10);
	
	
}

loop(){
    int i, j, k, futurePointP, futurePointS;
    getCloseEnemy();
    while (getDistToTarget() <= 9){
        upgradeAGI(1);
        attackRanged(getTargetX(), getTargetY());
        if (getHp() <= 80 && getLastHitTime() <= 2.0){        //mais importante de todos
            if (getTargetX() < 12.5 && getTargetY() < 12.5 && getX() > 2.5 && getY() > 2.5){
                teleport (0,0);
                speak("Heroes never die!");
                ambush();
            }
            if (getTargetX() > 12.5 && getTargetY() < 12.5 && getX() < 22.5 && getY() > 2.5){
                teleport (25,0);
                speak("Heroes never die!");
                ambush();
            }
            if (getTargetX() > 12.5 && getTargetY() > 12.5 && getX() < 22.5 && getY() < 22.5){
                teleport (25,25);
                speak("Heroes never die!");
                ambush();
            }
            if (getTargetX() < 12.5 && getTargetY() > 12.5 && getX() > 2.5 && getY() < 22.5){
                teleport (0,25);
                speak("Heroes never die!");
                ambush();
            }
        }
        if (getHit()){
            turnToAngle(getLastHitAngle());
            getTargetX(); getTargetY();
        }
        if (getTargetHealth() == 0){
                getHighHp();
                if (!getHighHp()){
                    turn(180);
                    getHighHp;
                }
        }
        futurePointP = getTargetX();
        if (getX() == 12.5 && getTargetX() > futurePointP){
            futurePointS = getTargetX() + 1;
        }
        if (getX() == 12.5 && getTargetX() < futurePointP){
            futurePointS = getTargetX() - 1;
        }
        if (getTargetY() <= 12.5 && getTargetX() < 12.5 && getLastHitTime() <= 1.0 && getDistToTarget() >= 3 && howManyEnemies() == 1 && getHp() >= 120){
            teleport(0,0);
            speak("omae wa mou shindeiru!");
            ambush();
            assassinate(getTargetX(), getTargetY());
        }
        if (getTargetY() > 12.5 && getTargetX() <= 12.5 && getLastHitTime() <= 1.0 && getDistToTarget() >= 3 && howManyEnemies() == 1 && getHp() >= 120){
            teleport(25,0);
            speak("omae wa mou shindeiru!");
            ambush();
            assassinate(getTargetX(), getTargetY());
        }
        if (getTargetY() >= 12.5 && getTargetX() > 12.5 && getLastHitTime() <= 1.0 && getDistToTarget() >= 3 && howManyEnemies() == 1 && getHp() >= 120){
            teleport(25,25);
            speak("omae wa mou shindeiru!");
            ambush();
            assassinate(getTargetX(), getTargetY());
        }
        if (getTargetY() < 12.5 && getTargetX() >= 12.5 && getLastHitTime() <= 1.0 && getDistToTarget() >= 3 && howManyEnemies() == 1 && getHp() >= 120){
            teleport(0,25);
            speak("omae wa mou shindeiru!");
            ambush();
            assassinate(getTargetX(), getTargetY());
        }
        
        if (getDistToTarget() <= 2 && getX() < 12.5 && getY() < 12.5 && getLastHitTime() <= 0.5){
            teleport (25,0);
            speak("get out of me!");
            for (k=1; k<=8; k++){
                turn(90);
                getCloseEnemy();
                if (getCloseEnemy()){
                    k = 8;
                }
            }
        }
        if (getDistToTarget() <= 2 && getX() >= 12.5 && getY() < 12.5 && getLastHitTime() <= 0.5){
            teleport (25,25);
            speak("get out of me!");
            for (k=1; k<=8; k++){
                turn(90);
                getCloseEnemy();
                if (getCloseEnemy()){
                    k = 8;
                }
            }
        }
        if (getDistToTarget() <= 2 && getX() > 12.5 && getY() > 12.5 && getLastHitTime() <= 0.5){
            teleport (0,25);
            speak("get out of me!");
            for (k=1; k<=8; k++){
                turn(90);
                getCloseEnemy();
                if (getCloseEnemy()){
                    k = 8;
                }
            }
        }
        if (getDistToTarget() <= 2 && getX() <= 12.5 && getY() > 12.5 && getLastHitTime() <= 0.5){
            teleport (0,0);
            speak("get out of me!");
            for (k=1; k<=8; k++){
                turn(90);
                getCloseEnemy();
                if (getCloseEnemy()){
                    k = 8;
                }
            }
        }
        if (getLastHitTime() <= 6.0 && getAp() >=140){
            ambush();
            speak("Ataque atordoante");
        }
    }
    if (getHit()){
        turnToAngle(getLastHitAngle());
        if (getCloseEnemy() && getDistToTarget() <= 2){
            getCloseEnemy();
        }
        if (getcloseEnemy() && getDistToTarget() >=3){
            getFarEnemy();
        }
    }
else {
    moveTo(12.5,12.5);
    if (getX() == 12.5 && getY() == 12.5){
        for (i=1; i<=8 ;i++){
            turn(45);
            if (getAmbushTimeLeft() == 0 && getAp() >= 140){
                ambush();
            }
            for (j=1; j<=5 ;j++){
                stepForward();
                if (getCloseEnemy()){
                    i = 10;
                }
            }
        }
    }
}
}