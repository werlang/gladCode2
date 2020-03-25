def loop():
    if getLowHp():
        if getHp() > 20:
            while not attackRanged(getTargetX(), getTargetY()):
                pass
        else:
            stepBack()
     
    else:
        turnRight(5)
 