'''
contém as funções que podem ser chamadas diretamente pelo usuário.
Estas funções somente enviam sinais do cliente para o servidor. O servidor é quem executa as funções e devolve a resposta.
Desta maneira somente com a sintaxe dos sinais, pode-se fazer o port facilmente para qualquer linguagem.
'''

from gladCodeCore import *

def getSimTime():
	return float(sendMessage("getSimTime", r))

def setSTR(arg):
	sendMessage("setSTR {}".format(arg))

def getSTR():
	return int(sendMessage("getSTR"))

def setAGI(arg):
	sendMessage("setAGI {}".format(arg))

def getAGI():
	return int(sendMessage("getAGI"))

def setINT(arg):
	sendMessage("setINT {}".format(arg))

def getINT():
	return int(sendMessage("getINT"))

def setName(name):
	name = name.replace(" ", "#")
	sendMessage("setName {}".format(name))

def getName():
	return sendMessage("getName")

def upgradeSTR(n):
	return int(sendMessage("upgradeSTR {}".format(n)))

def upgradeAGI(n):
	return int(sendMessage("upgradeAGI {}".format(n)))

def upgradeINT(n):
	return int(sendMessage("upgradeINT {}".format(n)))

def stepForward():
	return float(sendMessage("stepForward"))

def stepBack():
	return float(sendMessage("stepBack"))

def stepLeft():
	return float(sendMessage("stepLeft"))

def stepRight():
	return float(sendMessage("stepRight"))

def turnLeft(ang):
	return float(sendMessage("turnLeft {}".format(ang)))

def turnRight(ang):
	return float(sendMessage("turnRight {}".format(ang)))

def turn(ang):
	sendMessage("turn {}".format(ang))

def turnTo(x, y):
	if sendMessage("turnTo {} {}".format(x,y)) == "true":
		return 1
	else:
		return 0

def turnToTarget():
	if sendMessage("turnToTarget") == "true":
		return 1
	else:
		return 0

def turnToAngle(ang):
	sendMessage("turnToAngle {}".format(ang))

def moveForward(p):
	sendMessage("moveForward {}".format(p))

def moveTo(x, y):
	if sendMessage("moveTo {} {}".format(x,y)) == "true":
		return 1
	else:
		return 0

def moveToTarget():
	if sendMessage("moveToTarget") == "true":
		return 1
	else:
		return 0

def getX():
	return float(sendMessage("getX"))

def getY():
	return float(sendMessage("getY"))

def getHp():
	return float(sendMessage("getHp"))

def getAp():
	return float(sendMessage("getAp"))

def getSpeed():
	return float(sendMessage("getSpeed"))

def getHead():
	return float(sendMessage("getHead"))

def getDist(x, y):
	return float(sendMessage("getDist {} {}".format(x, y)))

def getDistToTarget():
	return float(sendMessage("getDistToTarget"))

def getAngle(x, y):
	return float(sendMessage("getAngle {} {}".format(x, y)))


def howManyEnemies():
	return int(sendMessage("howManyEnemies"))

def getCloseEnemy():
	return int(sendMessage("getCloseEnemy"))

def getFarEnemy():
	return int(sendMessage("getFarEnemy"))

def getLowHp():
	return int(sendMessage("getLowHp"))

def getHighHp():
	return int(sendMessage("getHighHp"))

def getTargetX():
	return float(sendMessage("getTargetX"))

def getTargetY():
	return float(sendMessage("getTargetY"))

def getTargetHealth():
	return float(sendMessage("getTargetHealth"))

def getTargetSpeed():
	return float(sendMessage("getTargetSpeed"))

def getTargetHead():
	return float(sendMessage("getTargetHead"))

def doYouSeeMe():
	if sendMessage("doYouSeeMe") == "true":
		return 1
	else:
		return 0

def isTargetVisible():
	if sendMessage("isTargetVisible") == "true":
		return 1
	else:
		return 0

def attackMelee():
	sendMessage("attackMelee")


def attackRanged(x, y):
	if sendMessage("attackRanged {} {}".format(x, y)) == "true":
		return 1
	else:
		return 0


def getLastHitTime():
	return float(sendMessage("getLastHitTime"))

def getLastHitAngle():
	return float(sendMessage("getLastHitAngle"))

def turnToLastHit():
	sendMessage("turnToLastHit")


def getHit():
	if sendMessage("getHit") == "true":
		return 1
	else:
		return 0

def getSafeRadius():
	return float(sendMessage("getSafeRadius"))

def isSafeHere():
	if sendMessage("isSafeHere") == "true":
		return 1
	else:
		return 0

def isSafeThere(x, y):
	if sendMessage("isSafeThere {} {}".format(x, y)) == "true":
		return 1
	else:
		return 0

def fireball(x, y):
	if sendMessage("fireball {} {}".format(x, y)) == "true":
		return 1
	else:
		return 0

def teleport(x, y):
	if sendMessage("teleport {} {}".format(x, y)) == "true":
		return 1
	else:
		return 0

def block():
	if sendMessage("block") == "true":
		return 1
	else:
		return 0

def ambush():
	if sendMessage("ambush") == "true":
		return 1
	else:
		return 0

def assassinate(x, y):
	if sendMessage("assassinate {} {}".format(x, y)) == "true":
		return 1
	else:
		return 0

def charge():
	if sendMessage("charge") == "true":
		return 1
	else:
		return 0

def getBlockTimeLeft():
	return float(sendMessage("getBlockTimeLeft"))

def getAmbushTimeLeft():
	return float(sendMessage("getAmbushTimeLeft"))

def getBurnTimeLeft():
	return float(sendMessage("getBurnTimeLeft"))

def setSpritesheet(str):
	#faz nada mesmo
	str = str

def isStunned():
	return int(sendMessage("isStunned"))

def isBurning():
	return int(sendMessage("isBurning"))

def isProtected():
	return int(sendMessage("isProtected"))

def isRunning():
	return int(sendMessage("isRunning"))

def isSlowed():
	return int(sendMessage("isSlowed"))

'''
#TODO
def speak(char *format, ...):
	va_list arg
	va_start(arg, format)

	char message[1000] = ""
	while (*format != '\0' && strlen(message) < 1000) :
		if (*format == '%') :
			format++
			if (*format == '%')
				sprintf(message, "%s%%", message)
			else if (*format == 'c')
				sprintf(message, "%s%c", message, va_arg(arg, int))
			else if (*format == 's')
				sprintf(message, "%s%s", message, va_arg(arg, char*))
			else if (*format == 'i' || *format == 'd')
				sprintf(message, "%s%i", message, va_arg(arg, int))
			else if (*format == 'f')
				sprintf(message, "%s%f", message, va_arg(arg, double))
			else if (*format == '.'):
				char f[10] = "%s%.0f"
				f[4] = *(format + 1)
				format += 2
				sprintf(message, f, message, va_arg(arg, double))
			
		
		else :
			sprintf(message, "%s%c", message, *format)
		
		format++
	
	va_end(arg)
	message[999] = '\0'

	char m[1000], apiMessage[1000], r[10]
	strncpy(m, message, 1000)
	sprintf(apiMessage, "speak %s", m)
	apiMessage[999] = '\0'
	sendMessage(apiMessage, r)
'''

def getLvl():
	return int(sendMessage("getLvl"))

def breakpoint(message):
	sendMessage("breakpoint {}".format(message))

def setPosition(x, y):
	sendMessage("setPosition {} {}".format(x, y))

def setHp(hp):
	sendMessage("setHp {}".format(hp))

def setAp(ap):
	sendMessage("setAp {}".format(ap))

def lvlUp(n):
	sendMessage("lvlUp {}".format(n))
