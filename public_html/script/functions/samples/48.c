loop(){
    if (getSTR() >= 30)
        upgradeINT(1);
    else
        upgradeSTR(1);
    while(!moveTo(5,20));
    while(!moveTo(20,5));
}