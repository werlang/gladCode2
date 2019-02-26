#include<stdio.h>

main(){
    int peso_total, carga_max;
    printf("Qual a carga maxima que o elevador suporta? \n");
    scanf("%i",&carga_max);
    printf("Qual peso total no elevador? \n");
    scanf("%i",&peso_total);
    
    if (peso_total > carga_max){
        printf("Limite ultrapassado. Elevador parado.\n");
        int carga_remover, nova_carga;
        printf("Informe o peso a ser removido do elevador: \n");
        scanf("%i",&carga_remover);
        nova_carga = peso_total - carga_remover;
        if (nova_carga > carga_max){
            printf("Elevador permanece parado.");
        }
        else{
            printf("Elevador foi liberado.");
        }
    }
    else{
        printf("Elevador pode prosseguir.");
    }
}



