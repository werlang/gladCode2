#!/bin/bash

i=0
while [ -f code$i.* ]; do
	# compile and run C file
	if [ -f code$i.c ]; then
		(gcc -o code$i code$i.c 2>> errorc.txt -lm && ./code$i) &
	fi

	# compile and run Python file
	if [ -f code$i.py ]; then
		(python3 code$i.py 2>> errorc.txt) &
	fi
	i=$((i + 1))
done

# "sandbox" (passado pelo runner so em execucoes do editor) libera setHp, setPosition, setAp, lvlUp e slots -1
mode=""
if [ "$1" = "sandbox" ]; then
	mode="sandbox"
fi

gcc -o gladCodeServerMain gladCodeServerMain.c -lm -lpthread && ./gladCodeServerMain $i $mode
