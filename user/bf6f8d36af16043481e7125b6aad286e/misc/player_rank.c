#include<stdio.h>
#include<stdlib.h>
#include<time.h>
#include<math.h>

struct player {
    float skill;
    float mmr;
};
int psize;
int basereward;
int startmmr;
float mmrflex;
struct player *p;
int groupsize = 1;

void init_p(){
    p = (struct player*)malloc(sizeof(struct player) * psize);
    int i;
    int max = 100;
    int min = 0;
    for (i=0 ; i<psize ; i++){
        p[i].skill = (float)(rand()%(max-min+1)+min)/100;
        p[i].mmr = startmmr;
    }
    
    //p[i-1].skill = 100;
    //p[i-1].mmr = startmmr;
}

findmatch(int *rp1, int *rp2){
    int rpt;
    int contsearch = 100;
    float maxdist = 50;
    float mindist, dist;
    
    *rp1 = rand()%psize;
    do{
        do{
            *rp2 = rand()%psize;
        }while(*rp1 == *rp2);
        dist = abs(p[*rp1].mmr - p[*rp2].mmr);
        if (contsearch == 100 || dist < mindist){
            mindist = dist;
            rpt = *rp2;
        }
        contsearch--;
    }while(dist > maxdist && contsearch >= 0);
    if (contsearch == 0)
        *rp2 = rpt;
}

void battle(int n){
    int i,j;
    int rp1, rp2;
    float odds1, odds2;
    int oddsalpha = 100;
    for (i=0 ; i<n ; i++){
        for (j=0 ; j<psize ; j++){
            findmatch(&rp1, &rp2);
            odds1 = rand()%oddsalpha;
            odds2 = rand()%oddsalpha;
            
            int winner, loser, tie=0;
            if (odds1 * p[rp1].skill > odds2 * p[rp2].skill){
                winner = rp1;
                loser = rp2;
            }
            else if (odds1 * p[rp1].skill < odds2 * p[rp2].skill){
                winner = rp2;
                loser = rp1;
            }
            else
                tie = 1;
            
            if (!tie){
                float difdivision = (float)(p[winner].mmr - startmmr)/basereward - (float)(p[loser].mmr - startmmr)/basereward;
                //printf("--> %f\n",difdivision);
                float mmradjust = basereward * difdivision * mmrflex;
                //printf("1---> w:%i l:%i m:%.2f\n",p[winner].mmr, p[loser].mmr, basereward - mmradjust);
                p[winner].mmr += basereward - mmradjust;
                p[loser].mmr -= basereward - mmradjust;
                //printf("2---> w:%i l:%i m:%.2f\n",p[winner].mmr, p[loser].mmr, basereward - mmradjust);
        
                if (p[rp1].mmr < 0)
                    p[rp1].mmr = 0;
                if (p[rp2].mmr < 0)
                    p[rp2].mmr = 0;
            }
        }
    }
}

void print_mmr(){
    int i, troca,aux;
    int n=5000;
    n = n/groupsize;
    float mmrorder[n];
    float skillorder[n];
    for (i=0 ; i<n ; i++){
        mmrorder[i] = 0;
        skillorder[i] = 0;
    }
    for (i=0 ; i<psize ; i++){
        mmrorder[(int)p[i].mmr/groupsize]++;
        skillorder[(int)p[i].mmr/groupsize] += p[i].skill;
        //printf("%.2f\n",p[i].skill);
    }
    for (i=0 ; i<n ; i++){
        if (mmrorder[i] > 0)
            printf("MMR: %4i  Qtd: %3.0f  Skill: %.2f\n",i*groupsize,mmrorder[i],skillorder[i]/mmrorder[i]);
    }
    //printf("MMR: %3.0f  Skill: %.2f\n",p[psize-1].mmr,p[psize-1].skill);
    
}

int main(){
    srand(time(NULL));
    startmmr = 1000;
    basereward = 10;
    mmrflex = 0.1;
    psize = 10000;
    int nbattles = 400;
    groupsize = 10;

    init_p();
    
    battle(nbattles);
    
    print_mmr();
    
    return 0;
}