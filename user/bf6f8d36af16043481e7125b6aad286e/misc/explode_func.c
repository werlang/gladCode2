#include<string.h>
#include<stdio.h>
#include<stdlib.h>

struct stringArgs {
	char toStr[100];
	int toInt;
	float toFloat;
};

struct stringFunc {
	char call[100];
	int nargs;
	struct stringArgs *arg;
};

struct stringFunc *decodeFuncArg(char *client_message){
	struct stringFunc *func = (struct stringFunc*) malloc(sizeof(struct stringFunc));
	func->arg = NULL;
	strcpy(func->call, client_message);
	char *p = strstr(func->call, " ");
	int i=0;
	if (p){
		*p = '\0';
		char temp[500];
		strcpy(temp, p+1);
		do{
			if (func->arg)
				func->arg = (struct stringArgs*) realloc(func->arg, sizeof(struct stringArgs) * (i+1));
			else
				func->arg = (struct stringArgs*) malloc(sizeof(struct stringArgs) * (i+1));
			
			strcpy(func->arg[i].toStr, temp);
			p = strstr(func->arg[i].toStr, " ");
			if (p){
				*p = '\0';
				strcpy(temp, p+1);
			}
			func->arg[i].toInt = atoi(func->arg[i].toStr);
			func->arg[i].toFloat = atof(func->arg[i].toStr);
			i++;
		}while (p);
	}
	func->nargs = i;
	return func;
}

main(){
    struct stringFunc *f = decodeFuncArg("funcao arg1 10 1.2345");
    printf("C:%s\n",f->call);
    printf("A:%s\n",f->arg[0].toStr);
    printf("A:%i\n",f->arg[1].toInt);
    printf("A:%f\n",f->arg[2].toFloat);
}