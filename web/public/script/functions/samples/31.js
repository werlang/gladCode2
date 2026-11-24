let start = true;
function loop() {
    if (getLowHp()){
        const d = getDistToTarget();
        if (!isSlowed() && d > 2)
            charge();
        else if (d <= 1)
            attackMelee();
        else
            moveToTarget();
    }
    else if (start || !isSafeHere()){
        if(moveTo(12.5,12.5))
            start = false;
    }
    else
        turn(5);
}