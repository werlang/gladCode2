loop(){
    if (getAGI() >= 15)
        upgradeINT();
    else
        upgradeAGI();
    while(!moveTo(5,20));
    while(!moveTo(20,5));
}