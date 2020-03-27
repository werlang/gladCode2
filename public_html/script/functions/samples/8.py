def loop():
    if getAGI() >= 15:
        upgradeINT(5)
    else:
        upgradeAGI(5)
    while not moveTo(5,20):
        pass
    while not moveTo(20,5):
        pass
 