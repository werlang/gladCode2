let centro = false;
function loop() {
    if (!centro){
        while(!moveTo(12.5,12.5));
        centro = true;
    }
    turnLeft(5);
    stepForward();
}