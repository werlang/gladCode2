#include "gladCodeCore.c"

setup(){
}

executa(){
    char r[1000];
    sendMessage("getGlads",r);
    printf("%s\n\n",r);
}