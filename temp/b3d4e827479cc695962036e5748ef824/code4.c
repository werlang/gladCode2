#include "gladCodeCore.c"
setup(){
	setName("Golden Archer@Geff");
	setSTR(3);
	setAGI(10);
	setINT(0);
}

int vai = 1;
int defesa = 0;
float x;
float y;

loop(){
    if(getAGI()<=17){        //Detecta os pontos de Agilidade e se estiver na condição, aumenta.
        upgradeAGI();
        
    }else{
        if(getAGI()==18){    //Se AGI e INT chegarem no nível ideal, aumenta a força.
                if(getSTR()<=3){
                    upgradeSTR();
            }
        }
    }
    
     ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Abaixo começa o código de movimentação e ataque.
    while(defesa==0){
        if(getAp()>=50){
            block();
            defesa=1;
        }
    }
    
    
    if(isSafeHere()){     //Se não tem veneno aqui, executa os códigos.
    
            if(getHit()){
                turnToLastHit(); //Se ele foi ferido, se vira para o lado de quem atacou.
            }
            
            if(getCloseEnemy()){        //Se detectar inimigo, fixa nele e ataca na posição que ele está.
                float x = getTargetX();
                float y = getTargetY();
                speak("EU SOU A LENDA!\nMORRA!");
                attackRanged(x,y);
                
            }else{
        
                if(vai == 1){                                                                                               //Dá um passo por vez e verifica se foi ferido e se vira para quem atacou e ataca. Se não, verifica se tem inimigo, e se tiver, ataca.
                    moveTo (12.5,12.5);
                    if(getHit()){
                        turnToLastHit(); //Se ele foi ferido, se vira para o lado de quem atacou.
                    }
                    if(getCloseEnemy()){
                        float x = getTargetX();
                        float y = getTargetY();
                        attackRanged(x,y);
                    }
                    if(getX() == 12.5 && getY() == 12.5){
                    vai=0;
                    }
                }
                
            if(vai==0){
                
                if(getAp()>=100){
                    block();
                                }
                turn(15);
                if(getCloseEnemy()){        //Se detectar inimigo, fixa nele e ataca na posição que ele está.
                    float x = getTargetX();
                    float y = getTargetY();
                    attackRanged(x,y);
                        }    
                    }
                 }
            
            }
        
    }
    
    
    
    
    
    
    
    
    
    
