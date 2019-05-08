/*
globais do ambiente, herdado do gladCode1
*/

#define PROJECTILE_MAX_DISTANCE 15
#define AP_REC_BASE 5 //recuperacao de ap
#define AP_REC_INT 0.5 //AP_REC+BASE + AP_REC_INT * INT
#define GLAD_HITBOX 0.5 //raio do hitbox do gladiador
#define XP_FACTOR 0.2 
#define XP_FIRSTLVL 25
#define POISON_TIME 45 //quanto tempo ele come�a a aparecer
#define POISON_SPEED 10 //quanto tempo leva para andar 1p

#define PROJECTILE_TYPE_ATTACK 0
#define PROJECTILE_TYPE_FIREBALL 1
#define PROJECTILE_TYPE_STUN 2

#define N_BUFFS 5
#define BUFF_BURN 0
#define BUFF_MOVEMENT 1
#define BUFF_RESIST 2
#define BUFF_INVISIBLE 3
#define BUFF_STUN 4

#define ABILITY_FIREBALL 0
#define ABILITY_TELEPORT 1
#define ABILITY_CHARGE 2
#define ABILITY_BLOCK 3
#define ABILITY_ASSASSINATE 4
#define ABILITY_AMBUSH 5

#define ACTION_MELEE_ATTACK 6
#define ACTION_RANGED_ATTACK 7
#define ACTION_MOVEMENT 8
#define ACTION_WAITING 9
#define ACTION_NONE 10

//custos de cada habilidade. os �ndices batem com as constantes dos buffs
int abilitycost[6] = {50,50,30,50,30,70};

struct buff {
    float timeleft;
    float value;
};

//lista encadeada dos projeteis
struct projectile {
	int id;
    int type; //tipo de projetil
    float x; //coordenadas
    float y;
    float spdx; //velocidade em nos componentes x e y
    float spdy;
    float dmg; //dano que causa se atingir
    float dist; //distancia ja percorrida desde seu lancamento
	int owner; //gladiador que disparou o projetil
	float head; //angulo do projetil
    struct projectile *next;
};

//struct dos gladiadores
struct gladiador{
	int port; //porta da conexao
    char name[50];
	char user[50];
    float x; //pos horizontal
    float y; //pos vertical
    float head; //angulo da cabeca 0..360, cresce no sentido hor�rio,

    int STR; //forca
    float hp; //vida
    float maxhp; //hp total
    float mdmg; //dano melee
    float rdmg; //dano ranged

    int AGI; //agilidade
    float as; //velocidade de ataque, em att/s
    float spd; //velocidade de movimento, em p/s
    float ts; //velocidade de rotacao, em g/s

    int INT; //intelecto
    float ap; //pontos de habilidade
    float maxap; //quantidade maxima de ap
    float cs; //velocidade de lancamento de habilidades

    int lvl; //nivel
    float vrad; //raio de visao, em g
    float vis; //alcance de visao, em p
    float lockedfor; //tempo que esta trancado em uma acao
    float lasthitangle; //angulo que recebeu o �ltimo ataque
	float lasthittime; //guarda quanto tempo atras o gladiador recebeu ataque
	int lasthitnotification; //se houve um hit desde a ultima verificacao
    int targetlocked; //porta do gladiador que est� fixado
	int targetsaved; //porta do gladiador salvo na mem�ria
    int xp; //experiencia do gladiador (em %)
    int up; //qual atributo vai ganhar upgrade quando subir de nivel
    struct buff buffs[N_BUFFS]; //vetor de buffs
	int action; //actioncode
	float time; //simtime
	float moveLock; //guarda valor para controle de movimentos de longa duracao
	char message[256];
	float msgtime;
};

struct gladiador *g, *go;
struct projectile *p;
int nglad = 0; //numero de gladiadores
int endsim = 0; //flag que indica o fim da simulacao
FILE *outArq;
//largura e altrua da arena, em passos
float screenW = 25;
float screenH = 25;
float timeInterval = 0.1; //intervalo de tempo da simulacao
float timeLimit = 200; //tempo limite da para o evento de fim da simula��o
//int rounds, estado;
//int winners[3];
int readytostart = 0;
pthread_mutex_t lock;
pthread_cond_t cond;