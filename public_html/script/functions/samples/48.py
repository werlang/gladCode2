def loop():
	if getSTR() >= 30:
		upgradeINT(1)
	else:
		upgradeSTR(1)
	while not moveTo(5,20):
		pass
	while not moveTo(20,5):
		pass
 