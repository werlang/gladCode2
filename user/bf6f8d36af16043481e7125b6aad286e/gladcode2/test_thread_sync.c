#include<stdio.h>
#include<stdlib.h>
#include<unistd.h>


int nglad;
float *simCounter;
float timeInterval;

int updateSimulation(int gladid){
	int i;	
	
	do{
		//usleep(10000);
		for (i=0 ; i<nglad ; i++){
			if (simCounter[gladid] > simCounter[i]){
				break;
			}
		}
	}while(i < nglad);
	
	simCounter[gladid] += timeInterval;
	
	if (simCounter[gladid] >= 1)
		return 0;
	else
		return 1;
}

int startSimulation(int gladid){
	int i;

	if (!simCounter){
		simCounter = (float*)malloc(sizeof(float) * nglad);
		for (i=0 ; i<nglad ; i++)
			simCounter[i] = -1;
	}
	simCounter[gladid] = 0;

	do{
		//usleep(100000);
		for (i=0 ; i<nglad ; i++){
			if ( simCounter[i] != 0 )
				break;
		}
	}while(i < nglad);
	
	return 1;
}

int main(){
    struct timeval tv;
    gettimeofday(&tv,NULL);
	long unsigned int seci = tv.tv_sec;
	long unsigned int useci = tv.tv_usec;

    int i;
    timeInterval = 0.1;
    nglad = 5;


    for (i=0 ; i<nglad ; i++)
        startSimulation(i);
        
    while (simCounter[0] < 500){
        for (i=0 ; i<nglad ; i++){
            updateSimulation(i);
            //printf("%.1f ",simCounter[i]);
        }
        //printf("\n");
    }
    
    gettimeofday(&tv,NULL);
	long unsigned int secf = tv.tv_sec;
	long unsigned int usecf = tv.tv_usec;
    printf("\nprocess ended after %lu.%06lu seconds\n",secf-seci,usecf-useci);
    return 0;
}