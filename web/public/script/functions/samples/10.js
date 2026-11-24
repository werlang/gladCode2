let start = true;
function loop() {
    if (start){
        if(moveTo(12.5,12.5))
            start = false;
    }
    else if (getHit()){
        if (getBurnTimeLeft() > 0)
            teleport(0,0);
        else{
            ambush();
            turnToLastHit();
        }
    }
    else if (!start)
        turn(50);
}