let start = true;

function loop() {
    if (start){
        while(!moveTo(7.5,12.5));
        turnTo(12.5,12.5);
        start = false;
    }
    moveForward(10);
    turn(180);
}