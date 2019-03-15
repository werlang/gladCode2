/*
contém as funções que podem ser chamadas diretamente pelo usuário.
Estas funções somente enviam sinais do cliente para o servidor. O servidor é quem executa as funções e devolve a resposta.
Desta maneira somente com a sintaxe dos sinais, pode-se fazer o port facilmente para qualquer linguagem.
*/

float getSimCounter(){
	char r[10];
	sendMessage("getSimCounter", r);
	return atof(r);
}

void setSTR(int arg){
	char message[50], response[10];
	sprintf(message, "setSTR %i", arg);
	sendMessage(message,response);
}

int getSTR(){
	char response[10];
	sendMessage("getSTR", response);
	return atoi(response);
}

void setAGI(int arg){
	char message[50], response[10];
	sprintf(message, "setAGI %i", arg);
	sendMessage(message,response);
}

int getAGI(){
	char response[10];
	sendMessage("getAGI", response);
	return atoi(response);
}

void setINT(int arg){
	char message[50], response[10];
	sprintf(message, "setINT %i", arg);
	sendMessage(message,response);
}

int getINT(){
	char response[10];
	sendMessage("getINT", response);
	return atoi(response);
}


void setName(char *name){
	char m[100], *r, bla[100];
	int i;
	//faz isso pra trocar todos espeços por #
	strcpy(bla,name);
	for (i=0 ; name[i] != '\0' ; i++){
		if (name[i] == ' ')
			bla[i] = '#';
	}
	sprintf(m, "setName %s", bla);
	sendMessage(m, r);
}

char* getName(){
	char *response = (char*)malloc(sizeof(char)*100);
	sendMessage("getName", response);
	return response;
}

void upgradeSTR(){
	char r[10];
	sendMessage("upgradeSTR", r);
}

void upgradeAGI(){
	char r[10];
	sendMessage("upgradeAGI", r);
}

void upgradeINT(){
	char r[10];
	sendMessage("upgradeINT", r);
}

float stepForward(){
	char r[10];
	sendMessage("stepForward", r);
	return atof(r);
}

float stepBack(){
	char r[10];
	sendMessage("stepBack", r);
	return atof(r);
}

float stepLeft(){
	char r[10];
	sendMessage("stepLeft", r);
	return atof(r);
}

float stepRight(){
	char r[10];
	sendMessage("stepRight", r);
	return atof(r);
}

float turnLeft(float ang){
	char m[100], r[10];
	sprintf(m, "turnLeft %f", ang);
	sendMessage(m, r);
	return atof(r);
}

float turnRight(float ang){
	char m[100], r[10];
	sprintf(m, "turnRight %f", ang);
	sendMessage(m, r);
	return atof(r);
}

void turn(float ang){
	char m[100], r[10];
	sprintf(m, "turn %f", ang);
	sendMessage(m, r);
}

int turnTo(float x, float y){
	char m[100], r[10];
	sprintf(m, "turnTo %f %f", x, y);
	sendMessage(m, r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

int turnToTarget(){
	char m[100], r[10];
	sprintf(m, "turnToTarget");
	sendMessage(m, r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

void turnToAngle(float ang){
	char m[100], r[10];
	sprintf(m, "turnToAngle %f", ang);
	sendMessage(m, r);
}

void moveForward(float p){
	char m[100], r[10];
	sprintf(m, "moveForward %f", p);
	sendMessage(m, r);
}

int moveTo(float x, float y){
	char m[100], r[10];
	sprintf(m, "moveTo %f %f", x, y);
	sendMessage(m, r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

int moveToTarget(){
	char m[100], r[10];
	sprintf(m, "moveToTarget");
	sendMessage(m, r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

float getX(){
	char r[10];
	sendMessage("getX", r);
	return atof(r);
}

float getY(){
	char r[10];
	sendMessage("getY", r);
	return atof(r);
}

float getHp(){
	char r[10];
	sendMessage("getHp", r);
	return atof(r);
}

float getAp(){
	char r[10];
	sendMessage("getAp", r);
	return atof(r);
}

float getSpeed(){
	char r[10];
	sendMessage("getSpeed", r);
	return atof(r);
}

float getHead(){
	char r[10];
	sendMessage("getHead", r);
	return atof(r);
}

float getDist(float x, float y){
	char m[100], r[10];
	sprintf(m, "getDist %f %f", x, y);
	sendMessage(m, r);
	return atof(r);
}

float getDistToTarget(){
	char r[10];
	sendMessage("getDistToTarget", r);
	return atof(r);
}

float getAngle(float x, float y){
	char m[100], r[10];
	sprintf(m, "getAngle %f %f", x, y);
	sendMessage(m, r);
	return atof(r);
}

int howManyEnemies(){
	char r[10];
	sendMessage("howManyEnemies", r);
	return atoi(r);
}

int getCloseEnemy(){
	char r[10];
	sendMessage("getCloseEnemy", r);
	return atoi(r);
}

int getFarEnemy(){
	char r[10];
	sendMessage("getFarEnemy", r);
	return atoi(r);
}

int getLowHp(){
	char r[10];
	sendMessage("getLowHp", r);
	return atoi(r);
}

int getHighHp(){
	char r[10];
	sendMessage("getHighHp", r);
	return atoi(r);
}

float getTargetX(){
	char r[10];
	sendMessage("getTargetX", r);
	return atof(r);
}

float getTargetY(){
	char r[10];
	sendMessage("getTargetY", r);
	return atof(r);
}

float getTargetHealth(){
	char r[10];
	sendMessage("getTargetHealth", r);
	return atof(r);
}

float getTargetSpeed(){
	char r[10];
	sendMessage("getTargetSpeed", r);
	return atof(r);
}

float getTargetHead(){
	char r[10];
	sendMessage("getTargetHead", r);
	return atof(r);
}

int doYouSeeMe(){
	char r[10];
	sendMessage("doYouSeeMe", r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

int isTargetVisible(){
	char r[10];
	sendMessage("isTargetVisible", r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

void attackMelee(){
	char r[10];
	sendMessage("attackMelee", r);
}

int attackRanged(float x, float y){
	char m[100], r[10];
	sprintf(m, "attackRanged %f %f", x, y);
	sendMessage(m, r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

float getLastHitTime(){
	char response[10];
	sendMessage("getLastHitTime", response);
	return atof(response);
}

float getLastHitAngle(){
	char response[10];
	sendMessage("getLastHitAngle", response);
	return atof(response);
}

void turnToLastHit(){
	char r[10];
	sendMessage("turnToLastHit", r);
}

int getHit(){
	char response[10];
	sendMessage("getHit", response);
	if (strcmp(response, "true") == 0)
		return 1;
	else
		return 0;
}

float getSafeRadius(){
	char response[10];
	sendMessage("getSafeRadius", response);
	return atof(response);
}

int isSafeHere(){
	char response[10];
	sendMessage("isSafeHere", response);
	if (strcmp(response, "true") == 0)
		return 1;
	else
		return 0;
}

int isSafeThere(float x, float y){
	char m[100], r[10];
	sprintf(m, "isSafeThere %f %f", x, y);
	sendMessage(m, r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

int fireball(float x, float y){
	char m[100], r[10];
	sprintf(m, "fireball %f %f", x, y);
	sendMessage(m, r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

int teleport(float x, float y){
	char m[100], r[10];
	sprintf(m, "teleport %f %f", x, y);
	sendMessage(m, r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

int block(){
	char response[10];
	sendMessage("block", response);
	if (strcmp(response, "true") == 0)
		return 1;
	else
		return 0;
}

int ambush(){
	char response[10];
	sendMessage("ambush", response);
	if (strcmp(response, "true") == 0)
		return 1;
	else
		return 0;
}

int assassinate(float x, float y){
	char m[100], r[10];
	sprintf(m, "assassinate %f %f", x, y);
	sendMessage(m, r);
	if (strcmp(r, "true") == 0)
		return 1;
	else
		return 0;
}

int charge(){
	char response[10];
	sendMessage("charge", response);
	if (strcmp(response, "true") == 0)
		return 1;
	else
		return 0;
}

float getBlockTimeLeft(){
	char r[10];
	sendMessage("getBlockTimeLeft", r);
	return atof(r);
}

float getAmbushTimeLeft(){
	char r[10];
	sendMessage("getAmbushTimeLeft", r);
	return atof(r);
}

void setSpritesheet(char *str){
	//faz nada mesmo
}

int isStunned(){
	char r[10];
	sendMessage("isStunned", r);
	return atoi(r);
}

int isBurning(){
	char r[10];
	sendMessage("isBurning", r);
	return atoi(r);
}

int isProtected(){
	char r[10];
	sendMessage("isProtected", r);
	return atoi(r);
}

int isRunning(){
	char r[10];
	sendMessage("isRunning", r);
	return atoi(r);
}

int isSlowed(){
	char r[10];
	sendMessage("isSlowed", r);
	return atoi(r);
}
void speak(char *message){
	char m[1000], apiMessage[1000], r[10];
	strncpy(m, message, 1000);
	sprintf(apiMessage, "speak %s", m);
	apiMessage[999] = '\0';
	sendMessage(apiMessage, r);
}

