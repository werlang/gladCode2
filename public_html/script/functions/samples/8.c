loop(){
    if (getAGI() >= 15)
        upgradeINT(5);
    else
        upgradeAGI(5);
    while(!moveTo(5,20));
    while(!moveTo(20,5));
}