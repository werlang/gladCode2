start = True
def loop():
	global start
	if start:
		if moveTo(12.5,12.5):
			start = False
	 
	if getLowHp():
		charge()
	elif not start:
		turn(50)
 