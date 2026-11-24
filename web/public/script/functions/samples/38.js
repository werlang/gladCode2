let centro = false;
function loop() {
    if (!centro){
        while(!moveTo(12.5,12.5));
        centro = true;
    }
    turnRight(5);
    stepBack();
}