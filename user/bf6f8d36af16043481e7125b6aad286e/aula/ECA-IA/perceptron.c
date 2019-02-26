#include <math.h>
#include <stdio.h>

#define IS 2
#define TS 4

int main(void) {
	float o, e, l, t, a;
	int r=0, it0, it1;

	float inputs[TS][IS] = {
        {0,0},
        {0,1},
        {1,0},
        {1,1},
	};
	float outputs[TS] = {0,0,1,0};

	float i[IS], w[IS];

    for (it1=0 ; it1<IS ; it1++){
        w[it1] = 0;
    }


	l = 0.001;
    t = 0;
	do {
	    a=0;
        for (it0=0 ; it0<TS ; it0++){
            for (it1=0 ; it1<IS ; it1++)
                i[it1] = inputs[it0][it1];

            o = outputs[it0];

            float yo=0, y;
            for (it1=0 ; it1<IS ; it1++)
                yo += i[it1] * w[it1];
            
            if (yo >= t)
                y = 1;
            else
                y = 0;
            
            for (it1=0 ; it1<IS ; it1++){
                w[it1] = w[it1] + l * (o - y) * i[it1];
                t = t - l * (o - y);
            }
            
            if (y == o)
                a++;
        }
		r++;
	} while (a < TS && r < 1000000);

	for (it1=0 ; it1<IS ; it1++){
        printf("w%i:%f\n", it1, w[it1]);
    }
	printf("\nT:%.5f\n",t);
	printf("R:%i\n",r);

	return 0;
}
