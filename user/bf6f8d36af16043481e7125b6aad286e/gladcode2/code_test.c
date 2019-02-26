#include "gladCodeCore.c"

setup(){
    //setName("Robot");
    //setSTR(10);
    //setAGI(7);
    //setINT(5);
}

executa(){
    struct timeval tv;
    char r[1000];
    int i;
    sendMessage("getMyId",r);
    printf("id: %s  ",r);
    sendMessage("getMyPort",r);
    printf("port: %s\n",r);
    for (i=0 ; i<1000 ; i++){
        sendMessage("getGlads",r);
        gettimeofday(&tv,NULL);
        if (i == 0 || i == 999)
            printf("glads: %s\ntime: %lu\n",r, tv.tv_usec);
    }
    printf("\n");
}