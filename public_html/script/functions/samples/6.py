def loop():
    if not isTargetVisible():
        getLowHp()
    else:
        if doYouSeeMe():
            stepLeft()
            turnToTarget()
         
        else:
            attackRanged(getTargetX(), getTargetY())
     
 