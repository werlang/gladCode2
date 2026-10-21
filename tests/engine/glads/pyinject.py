def loop():
    if getSimTime() > 1 and getSimTime() < 1.3:
        speak('a"},{"crashed":1},{"crashed":1},{"crashed":1},{"crashed":1,"z":"b')
    if getCloseEnemy():
        if getDistToTarget() < 1:
            attackMelee()
        else:
            moveToTarget()
    else:
        moveTo(12.5, 12.5)
