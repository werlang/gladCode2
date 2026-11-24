let start = true;
function loop() {
    if (start){
        if(moveTo(12.5,12.5))
            start = false;
    }
    if(getLowHp()){
        if (doYouSeeMe() && getBlockTimeLeft() <= 0)
            block();
        else
            charge();
    }
    else if (!start)
        turn(50);
}