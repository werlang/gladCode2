#include<stdio.h>

main(){
    float usd, btc=0, preco, quant;
    scanf("%f",&usd);
    char op;
    do{
        do{
            scanf(" %c",&op);
        }while(op != 'c' && op != 'v' && op != 'f');
        if (op != 'f'){
            scanf("%f",&preco);
            scanf("%f",&quant);
            if (op == 'c'){
                usd -= quant * preco;
                btc += quant;
            }
            else if (op == 'v'){
                usd += quant * preco;
                btc -= quant;
            }
        }
    }while(op != 'f');
    printf("%.2f\n",usd);
    printf("%.4f\n",btc);
}