def loop():
    if getLowHp():
        if isBurning():
            if getAmbushTimeLeft() == 0:
                ambush()
            
        else:
            attackRanged(getTargetX(), getTargetY())
     
    else:
        turn(50)
    while not isSafeHere():
        moveTo(12.5,12.5)
    
 