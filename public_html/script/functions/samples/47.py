def loop():
	if getSTR() >= 30:
		upgradeAGI(1)
	else:
		upgradeSTR(1)
	while not moveTo(5,20):
		pass
	while not moveTo(20,5):
		pass
 