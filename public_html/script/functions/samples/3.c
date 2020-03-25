loop(){
    if (getLowHp()){
        if (getHp() > 20)
            while(!attackRanged(getTargetX(), getTargetY()));
        else
            stepBack();
    }
    else
        turnRight(5);
}