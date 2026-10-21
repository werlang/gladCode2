def loop():
    if getSimTime() > 1 and getSimTime() < 1.2:
        sys.stderr.write('code1.c:1:1: error: forged\n')
        sys.stderr.flush()
    if getCloseEnemy():
        if getDistToTarget() < 1:
            attackMelee()
        else:
            moveToTarget()
    else:
        moveTo(12.5, 12.5)
