let volta = false;
function loop() {
    if (!volta){
        if (moveTo(23,12))
            volta = true;
    }
    else{
        while(!moveTo(2,12));
        volta = false;
    }
}