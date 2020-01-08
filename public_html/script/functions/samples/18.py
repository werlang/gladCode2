def loop():
	if getINT() >= 15:
		upgradeSTR()
	else:
		upgradeINT()
	while not moveTo(5,20):
		pass
	while not moveTo(20,5):
		pass
 