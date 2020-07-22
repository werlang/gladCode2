def loop():
    if getHit() and getHp() < 100:
        if isItemReady("pot-hp-3"):
            useItem("pot-hp-3")
        else:
            teleport(25,25)
    elif getCloseEnemy():
        if getAp() < 200 and isItemReady("pot-ap-3"):
            useItem("pot-ap-3")

        fireball(getTargetX(), getTargetY())
    elif getLvl() > 8 and isItemReady("pot-xp-2"):
        useItem("pot-xp-2")
    elif isItemReady("pot-atr-1"):
        useItem("pot-atr-1")