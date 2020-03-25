loop(){
    if (getINT() >= 15)
        upgradeSTR();
    else
        upgradeINT();
    while(!moveTo(5,20));
    while(!moveTo(20,5));
}