let start = true;

function loop() {
    if (start){
        start = false;
        lvlUp(10);
        setPosition(12.5, 12.5);
    }
    upgradeINT(5);
    if(getLowHp()){
        fireball(getTargetX(), getTargetY());
    }
    else{
        turn(50);
    }
    setHp(1000);
    setAp(1000);
    speak("Sou imortaaaal!!!");
}
