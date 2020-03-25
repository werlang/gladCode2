start = True
def loop():
    global start
    if start:
        if moveTo(12.5,12.5):
            start = False
     
    if getLowHp():
        if doYouSeeMe():
            turnToTarget()
            stepLeft()
         
        else:
            if getAmbushTimeLeft() > 0:
                assassinate(getTargetX(), getTargetY())
            else:
                ambush()

    elif not start:
        turn(50)
 