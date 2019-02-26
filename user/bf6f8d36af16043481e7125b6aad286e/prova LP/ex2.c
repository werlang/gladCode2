#include<stdio.h>

main(){
    int a, b, c, ca, cb, cc;
    scanf("%i %i %i",&a,&b,&c);
    scanf("%i %i %i",&ca,&cb,&cc);
    if (a == b || a == c || b == c)
        printf("Numeros repetidos\n");
    else if (a == b-1 && a == c-2)
        printf("Valores consecutivos");
    else if (ca != a || cb != b || cc != c)
        printf("Confirmacao incorreta\n");
    else
        printf("Senha cadastrada\n");
}