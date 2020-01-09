def loop():
	if getSTR() >= 15:
		upgradeAGI()
	else:
		upgradeSTR()
	while not moveTo(5,20):
		pass
	while not moveTo(20,5):
		pass
 