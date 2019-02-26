#include "gladCodeCore.c"

setup(){
    setName("Bot1");
    setSTR(10);
    setAGI(3);
    setINT(2);
}

loop(){
    struct timeval tv;
    char c[15], id[3];
    sendMessage("getSimCounters",c);
    sendMessage("getId",id);
    printf("%s %s %s ",getName(),id,c);
    gettimeofday(&tv,NULL);
    printf("%lu %lu\n",tv.tv_sec,tv.tv_usec);
}