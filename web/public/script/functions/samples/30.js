let x = 0, y = 0;
function loop() {

    if ((getX() == x && getY() == y) || !isSafeThere(x,y)){
        x = Math.floor(Math.random() * 251) / 10;
        y = Math.floor(Math.random() * 251) / 10;
    }

    if(isSafeThere(x,y)){
        if (getAp() > 70 && getDist(x,y) > 2)
            teleport(x,y);
        else
            moveTo(x,y);
    }
}