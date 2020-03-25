def loop():
    if getAGI() >= 15:
        upgradeINT()
    else:
        upgradeAGI()
    while not moveTo(5,20):
        pass
    while not moveTo(20,5):
        pass
 